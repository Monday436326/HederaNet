// src/services/hedera/TransactionService.ts - FINAL PRODUCTION VERSION
import {HEDERA_CONFIG} from '../../config/hedera.config';
import {Transaction} from '../../store/types';

class TransactionService {
  private tokenSymbolCache: Map<
    string,
    {symbol: string; decimals: number}
  > = new Map();

  // Get account transaction history from mirror node
  async getAccountTransactions(
    accountId: string,
    limit: number = 50,
  ): Promise<Transaction[]> {
    try {
      const response = await fetch(
        `${HEDERA_CONFIG.mirrorNodeUrl}/api/v1/accounts/${accountId}/transactions?limit=${limit}&order=desc&transactiontype=CRYPTOTRANSFER`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch transactions: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.transactions || data.transactions.length === 0) {
        return [];
      }

      const transactions: Transaction[] = await Promise.all(
        data.transactions.map(async (tx: any) =>
          this.parseTransaction(tx, accountId),
        ),
      );

      return transactions.filter((tx): tx is Transaction => tx !== null);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      return [];
    }
  }

  // Get token transfers for account
  async getTokenTransfers(
    accountId: string,
    tokenId?: string,
    limit: number = 50,
  ): Promise<Transaction[]> {
    try {
      let url = `${HEDERA_CONFIG.mirrorNodeUrl}/api/v1/transactions?account.id=${accountId}&transactiontype=CRYPTOTRANSFER&limit=${limit}&order=desc`;

      if (tokenId) {
        url += `&token.id=${tokenId}`;
      }

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch token transfers: ${response.statusText}`);
      }

      const data = await response.json();

      const transactions: Transaction[] = await Promise.all(
        data.transactions.map(async (tx: any) =>
          this.parseTransaction(tx, accountId),
        ),
      );

      return transactions.filter(
        (tx): tx is Transaction => tx !== null && tx.tokenId !== '',
      );
    } catch (error) {
      console.error('Error fetching token transfers:', error);
      return [];
    }
  }

  // Get specific transaction details
  async getTransaction(transactionId: string): Promise<Transaction | null> {
    try {
      const response = await fetch(
        `${HEDERA_CONFIG.mirrorNodeUrl}/api/v1/transactions/${transactionId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.ok) {
        return null;
      }

      const data = await response.json();

      if (data.transactions && data.transactions.length > 0) {
        return this.parseTransaction(data.transactions[0], '');
      }

      return null;
    } catch (error) {
      console.error('Error fetching transaction:', error);
      return null;
    }
  }

  // Parse transaction from mirror node response
  private async parseTransaction(
    tx: any,
    userAccountId: string,
  ): Promise<Transaction> {
    try {
      const isReceive =
        tx.transfers?.some(
          (t: any) => t.account === userAccountId && t.amount > 0,
        ) || false;

      let type: Transaction['type'] = isReceive ? 'receive' : 'send';
      let title = isReceive ? 'Received' : 'Sent';
      let description = '';
      let amount = 0;
      let token = 'HBAR';
      let tokenId = '';
      let from = '';
      let to = '';

      // Check if it's a token transfer
      if (tx.token_transfers && tx.token_transfers.length > 0) {
        const tokenTransfer = tx.token_transfers.find(
          (tt: any) => tt.account === userAccountId,
        );

        if (tokenTransfer) {
          tokenId = tokenTransfer.token_id;

          // Get token symbol
          const tokenInfo = await this.getTokenSymbol(tokenId);
          token = tokenInfo.symbol;
          amount = Math.abs(tokenTransfer.amount / Math.pow(10, tokenInfo.decimals));

          // Determine transaction type based on memo
          if (tx.memo_base64) {
            const memo = Buffer.from(tx.memo_base64, 'base64').toString('utf8');
            if (memo.includes('Service') || memo.includes('service')) {
              type = 'service';
              title = 'Service Payment';
            } else if (memo.includes('Energy') || memo.includes('energy')) {
              type = 'energy';
              title = 'Energy Trade';
            } else if (memo.includes('Compute') || memo.includes('compute')) {
              type = 'compute';
              title = 'Compute Credits';
            }
            description = memo;
          }

          // Get from/to addresses
          const otherTransfer = tx.token_transfers.find(
            (tt: any) => tt.account !== userAccountId,
          );
          if (otherTransfer) {
            if (isReceive) {
              from = otherTransfer.account;
              to = userAccountId;
            } else {
              from = userAccountId;
              to = otherTransfer.account;
            }
          }
        }
      } else if (tx.transfers && tx.transfers.length > 0) {
        // HBAR transfer
        const userTransfer = tx.transfers.find(
          (t: any) => t.account === userAccountId,
        );
        if (userTransfer) {
          amount = Math.abs(userTransfer.amount / 100000000); // Convert from tinybars
        }

        // Get from/to addresses
        const otherTransfer = tx.transfers.find(
          (t: any) => t.account !== userAccountId,
        );
        if (otherTransfer) {
          if (isReceive) {
            from = otherTransfer.account;
            to = userAccountId;
          } else {
            from = userAccountId;
            to = otherTransfer.account;
          }
        }
      }

      // Set description if not set
      if (!description) {
        description = `${isReceive ? 'From' : 'To'} ${
          isReceive ? from : to
        }`.substring(0, 30);
      }

      // Determine status
      const status: Transaction['status'] =
        tx.result === 'SUCCESS'
          ? 'completed'
          : tx.result === 'PENDING'
          ? 'pending'
          : 'failed';

      return {
        id: tx.transaction_id,
        type,
        title,
        description,
        amount,
        token,
        tokenId,
        from,
        to,
        timestamp: tx.consensus_timestamp,
        status,
        transactionHash: tx.transaction_hash || tx.transaction_id,
        memo: tx.memo_base64
          ? Buffer.from(tx.memo_base64, 'base64').toString('utf8')
          : undefined,
      };
    } catch (error) {
      console.error('Error parsing transaction:', error);
      // Return a minimal transaction object
      return {
        id: tx.transaction_id || 'unknown',
        type: 'send',
        title: 'Transaction',
        description: 'Error parsing transaction',
        amount: 0,
        token: 'HBAR',
        tokenId: '',
        from: '',
        to: '',
        timestamp: tx.consensus_timestamp || new Date().toISOString(),
        status: 'failed',
        transactionHash: tx.transaction_hash || tx.transaction_id || '',
      };
    }
  }

  // Get token symbol from cache or mirror node
  private async getTokenSymbol(
    tokenId: string,
  ): Promise<{symbol: string; decimals: number}> {
    if (this.tokenSymbolCache.has(tokenId)) {
      return this.tokenSymbolCache.get(tokenId)!;
    }

    try {
      const response = await fetch(
        `${HEDERA_CONFIG.mirrorNodeUrl}/api/v1/tokens/${tokenId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.ok) {
        throw new Error('Failed to fetch token info');
      }

      const data = await response.json();

      const info = {
        symbol: data.symbol || 'UNKNOWN',
        decimals: parseInt(data.decimals) || 8,
      };

      this.tokenSymbolCache.set(tokenId, info);
      return info;
    } catch (error) {
      console.error('Error fetching token symbol:', error);
      return {symbol: 'UNKNOWN', decimals: 8};
    }
  }

  // Get transaction statistics
  async getTransactionStats(
    accountId: string,
    days: number = 30,
  ): Promise<{
    totalTransactions: number;
    totalSent: number;
    totalReceived: number;
    servicePayments: number;
    energyTrades: number;
  }> {
    try {
      const startTime = Math.floor(
        (Date.now() - days * 24 * 60 * 60 * 1000) / 1000,
      );

      const response = await fetch(
        `${HEDERA_CONFIG.mirrorNodeUrl}/api/v1/accounts/${accountId}/transactions?timestamp=gte:${startTime}&limit=1000`,
      );

      if (!response.ok) {
        throw new Error('Failed to fetch transaction stats');
      }

      const data = await response.json();

      let totalSent = 0;
      let totalReceived = 0;
      let servicePayments = 0;
      let energyTrades = 0;

      for (const tx of data.transactions || []) {
        const parsed = await this.parseTransaction(tx, accountId);

        if (parsed.type === 'send') {
          totalSent += parsed.amount;
        } else if (parsed.type === 'receive') {
          totalReceived += parsed.amount;
        }

        if (parsed.type === 'service') servicePayments++;
        if (parsed.type === 'energy') energyTrades++;
      }

      return {
        totalTransactions: data.transactions?.length || 0,
        totalSent,
        totalReceived,
        servicePayments,
        energyTrades,
      };
    } catch (error) {
      console.error('Error fetching transaction stats:', error);
      return {
        totalTransactions: 0,
        totalSent: 0,
        totalReceived: 0,
        servicePayments: 0,
        energyTrades: 0,
      };
    }
  }

  // Clear cache
  clearCache(): void {
    this.tokenSymbolCache.clear();
  }
}

export const transactionService = new TransactionService();