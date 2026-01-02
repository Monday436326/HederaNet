// src/services/hedera/TokenService.ts - FINAL PRODUCTION VERSION
import {
  AccountId,
  TokenId,
  TransferTransaction,
  TokenAssociateTransaction,
  Hbar,
  HbarUnit
} from '@hashgraph/sdk';
import {getHederaClient, HEDERA_CONFIG} from '../../config/hedera.config';
import {walletService} from '../hedera/WalletService';
import {TokenBalance, TokenInfo} from '../../store/types';

class HederaTokenService {
  private client = getHederaClient();
  private tokenCache: Map<string, TokenInfo> = new Map();
  private priceCache: Map<string, {price: number; timestamp: number}> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // Get account token balances from mirror node
  async getAccountBalances(accountId: string): Promise<TokenBalance[]> {
    try {
      const response = await fetch(
        `${HEDERA_CONFIG.mirrorNodeUrl}/api/v1/accounts/${accountId}/tokens?limit=100`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.ok) {
        throw new Error(`Mirror node request failed: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.tokens || data.tokens.length === 0) {
        return [];
      }

      const balances: TokenBalance[] = await Promise.all(
        data.tokens.map(async (token: any) => {
          try {
            const tokenInfo = await this.getTokenInfo(token.token_id);
            const usdValue = await this.getTokenUSDValue(
              token.token_id,
              token.balance,
              tokenInfo.decimals,
            );

            return {
              tokenId: token.token_id,
              symbol: tokenInfo.symbol,
              name: tokenInfo.name,
              balance: token.balance / Math.pow(10, tokenInfo.decimals),
              decimals: tokenInfo.decimals,
              usdValue,
            };
          } catch (error) {
            console.error(`Error processing token ${token.token_id}:`, error);
            return null;
          }
        }),
      );

      return balances.filter((b): b is TokenBalance => b !== null);
    } catch (error) {
      console.error('Error fetching token balances:', error);
      throw new Error(`Failed to fetch token balances: ${error}`);
    }
  }

  // Get token information
  async getTokenInfo(tokenId: string): Promise<TokenInfo> {
    // Check cache first
    if (this.tokenCache.has(tokenId)) {
      return this.tokenCache.get(tokenId)!;
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
        throw new Error(`Failed to fetch token info: ${response.statusText}`);
      }

      const data = await response.json();

      const tokenInfo: TokenInfo = {
        tokenId: data.token_id,
        name: data.name,
        symbol: data.symbol,
        decimals: parseInt(data.decimals),
        totalSupply: data.total_supply,
        treasuryAccount: data.treasury_account_id,
      };

      // Cache the result
      this.tokenCache.set(tokenId, tokenInfo);

      return tokenInfo;
    } catch (error) {
      console.error('Error fetching token info:', error);
      
      // Return default info if fetch fails
      return {
        tokenId,
        name: 'Unknown Token',
        symbol: 'UNKNOWN',
        decimals: 8,
        totalSupply: '0',
        treasuryAccount: '0.0.0',
      };
    }
  }

  // Get HBAR balance
  async getHbarBalance(accountId: string): Promise<number> {
    try {
      const response = await fetch(
        `${HEDERA_CONFIG.mirrorNodeUrl}/api/v1/accounts/${accountId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch HBAR balance: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Balance in tinybars, convert to HBAR
      return data.balance.balance / 100000000;
    } catch (error) {
      console.error('Error fetching HBAR balance:', error);
      return 0;
    }
  }

  // Associate token with account
  async associateToken(tokenId: string): Promise<string> {
    const account = walletService.getCurrentAccount();
    if (!account) throw new Error('No wallet connected');

    try {
      const transaction = await new TokenAssociateTransaction()
        .setAccountId(AccountId.fromString(account.accountId))
        .setTokenIds([TokenId.fromString(tokenId)])
        .freezeWith(this.client);

      const signedTx = await walletService.signTransaction(transaction);
      const response = await signedTx.execute(this.client);
      await response.getReceipt(this.client);

      return response.transactionId.toString();
    } catch (error) {
      console.error('Error associating token:', error);
      throw new Error(`Failed to associate token: ${error}`);
    }
  }

  // Transfer tokens
  async transferToken(
    tokenId: string,
    recipientId: string,
    amount: number,
    decimals: number,
  ): Promise<string> {
    const account = walletService.getCurrentAccount();
    if (!account) throw new Error('No wallet connected');

    try {
      const amountInSmallestUnit = Math.floor(amount * Math.pow(10, decimals));

      const transaction = await new TransferTransaction()
        .addTokenTransfer(
          TokenId.fromString(tokenId),
          AccountId.fromString(account.accountId),
          -amountInSmallestUnit,
        )
        .addTokenTransfer(
          TokenId.fromString(tokenId),
          AccountId.fromString(recipientId),
          amountInSmallestUnit,
        )
        .setTransactionMemo(`HederaNet: ${amount} tokens`)
        .freezeWith(this.client);

      const signedTx = await walletService.signTransaction(transaction);
      const response = await signedTx.execute(this.client);
      await response.getReceipt(this.client);

      return response.transactionId.toString();
    } catch (error) {
      console.error('Error transferring token:', error);
      throw new Error(`Failed to transfer token: ${error}`);
    }
  }

  // Transfer HBAR
  async transferHbar(recipientId: string, amount: number): Promise<string> {
    const account = walletService.getCurrentAccount();
    if (!account) throw new Error('No wallet connected');

    try {
      const transaction = await new TransferTransaction()
        .addHbarTransfer(
          AccountId.fromString(account.accountId),
          Hbar.from(-amount, HbarUnit.Hbar),
        )
        .addHbarTransfer(AccountId.fromString(recipientId), Hbar.from(amount, HbarUnit.Hbar))
        .setTransactionMemo(`HederaNet: ${amount} HBAR`)
        .freezeWith(this.client);

      const signedTx = await walletService.signTransaction(transaction);
      const response = await signedTx.execute(this.client);
      await response.getReceipt(this.client);

      return response.transactionId.toString();
    } catch (error) {
      console.error('Error transferring HBAR:', error);
      throw new Error(`Failed to transfer HBAR: ${error}`);
    }
  }

  // Get token USD value
  private async getTokenUSDValue(
    tokenId: string,
    balance: number,
    decimals: number,
  ): Promise<number> {
    try {
      // Check cache first
      const cached = this.priceCache.get(tokenId);
      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
        return (balance / Math.pow(10, decimals)) * cached.price;
      }

      // Fetch price from API
      const response = await fetch(
        `https://api.hederanet.io/v1/tokens/${tokenId}/price`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.ok) {
        // Use default prices for known tokens
        const price = this.getDefaultPrice(tokenId);
        this.priceCache.set(tokenId, {price, timestamp: Date.now()});
        return (balance / Math.pow(10, decimals)) * price;
      }

      const data = await response.json();
      const price = data.usdPrice || 0;

      // Cache the price
      this.priceCache.set(tokenId, {price, timestamp: Date.now()});

      return (balance / Math.pow(10, decimals)) * price;
    } catch (error) {
      console.error('Error fetching token USD value:', error);
      // Use default price on error
      const price = this.getDefaultPrice(tokenId);
      return (balance / Math.pow(10, decimals)) * price;
    }
  }

  // Get default price for known tokens
  private getDefaultPrice(tokenId: string): number {
    // Default prices for HederaNet tokens
    const defaultPrices: Record<string, number> = {
      [HEDERA_CONFIG.tokens.hnet.toString()]: 2.0, // HNET = $2.00
      [HEDERA_CONFIG.tokens.hec.toString()]: 0.3, // HEC = $0.30
      [HEDERA_CONFIG.tokens.hcc.toString()]: 0.4, // HCC = $0.40
    };

    return defaultPrices[tokenId] || 0;
  }

  // Get HederaNet token balances (HNET, HEC, HCC)
  async getHederaNetTokenBalances(accountId: string): Promise<{
    hnet: TokenBalance;
    hec: TokenBalance;
    hcc: TokenBalance;
  }> {
    try {
      const [hnetInfo, hecInfo, hccInfo] = await Promise.all([
        this.getTokenInfo(HEDERA_CONFIG.tokens.hnet.toString()),
        this.getTokenInfo(HEDERA_CONFIG.tokens.hec.toString()),
        this.getTokenInfo(HEDERA_CONFIG.tokens.hcc.toString()),
      ]);

      const response = await fetch(
        `${HEDERA_CONFIG.mirrorNodeUrl}/api/v1/accounts/${accountId}/tokens?limit=100`,
      );

      if (!response.ok) {
        throw new Error('Failed to fetch account tokens');
      }

      const data = await response.json();

      const getBalance = (tokenId: string, decimals: number) => {
        const token = data.tokens?.find((t: any) => t.token_id === tokenId);
        return token ? token.balance / Math.pow(10, decimals) : 0;
      };

      const hnetBalance = getBalance(
        HEDERA_CONFIG.tokens.hnet.toString(),
        hnetInfo.decimals,
      );
      const hecBalance = getBalance(
        HEDERA_CONFIG.tokens.hec.toString(),
        hecInfo.decimals,
      );
      const hccBalance = getBalance(
        HEDERA_CONFIG.tokens.hcc.toString(),
        hccInfo.decimals,
      );

      return {
        hnet: {
          tokenId: HEDERA_CONFIG.tokens.hnet.toString(),
          symbol: hnetInfo.symbol,
          name: hnetInfo.name,
          balance: hnetBalance,
          decimals: hnetInfo.decimals,
          usdValue: await this.getTokenUSDValue(
            HEDERA_CONFIG.tokens.hnet.toString(),
            hnetBalance * Math.pow(10, hnetInfo.decimals),
            hnetInfo.decimals,
          ),
        },
        hec: {
          tokenId: HEDERA_CONFIG.tokens.hec.toString(),
          symbol: hecInfo.symbol,
          name: hecInfo.name,
          balance: hecBalance,
          decimals: hecInfo.decimals,
          usdValue: await this.getTokenUSDValue(
            HEDERA_CONFIG.tokens.hec.toString(),
            hecBalance * Math.pow(10, hecInfo.decimals),
            hecInfo.decimals,
          ),
        },
        hcc: {
          tokenId: HEDERA_CONFIG.tokens.hcc.toString(),
          symbol: hccInfo.symbol,
          name: hccInfo.name,
          balance: hccBalance,
          decimals: hccInfo.decimals,
          usdValue: await this.getTokenUSDValue(
            HEDERA_CONFIG.tokens.hcc.toString(),
            hccBalance * Math.pow(10, hccInfo.decimals),
            hccInfo.decimals,
          ),
        },
      };
    } catch (error) {
      console.error('Error fetching HederaNet token balances:', error);
      throw error;
    }
  }

  // Clear caches
  clearCache(): void {
    this.tokenCache.clear();
    this.priceCache.clear();
  }
}

export const hederaTokenService = new HederaTokenService();