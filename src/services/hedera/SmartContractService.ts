// src/services/hedera/SmartContractService.ts - FINAL PRODUCTION VERSION
import {
  ContractExecuteTransaction,
  ContractFunctionParameters,
  ContractCallQuery,
} from '@hashgraph/sdk';
import {getHederaClient, HEDERA_CONFIG} from '../../config/hedera.config';
import {walletService} from '../hedera/WalletService';
import {EnergyListing, Proposal} from '../../store/types';

class SmartContractService {
  private client = getHederaClient();

  // ==================== ENERGY TRADING CONTRACT ====================

  async createEnergyListing(
    energyAmount: number,
    pricePerKwh: number,
    durationSeconds: number,
    qualityProof: string,
  ): Promise<string> {
    const account = walletService.getCurrentAccount();
    if (!account) throw new Error('No wallet connected');

    try {
      const qualityProofBytes = Buffer.from(qualityProof.padEnd(32, '0'));

      const transaction = await new ContractExecuteTransaction()
        .setContractId(HEDERA_CONFIG.contracts.energyTrading)
        .setGas(100000)
        .setFunction(
          'createListing',
          new ContractFunctionParameters()
            .addUint256(Math.floor(energyAmount * 100))
            .addUint256(Math.floor(pricePerKwh * 100000000))
            .addUint256(durationSeconds)
            .addBytes32(qualityProofBytes),
        )
        .freezeWith(this.client);

      const signedTx = await walletService.signTransaction(transaction);
      const response = await signedTx.execute(this.client);
      await response.getReceipt(this.client);

      return response.transactionId.toString();
    } catch (error) {
      console.error('Error creating energy listing:', error);
      throw new Error(`Failed to create energy listing: ${error}`);
    }
  }

  async purchaseEnergy(listingId: string): Promise<string> {
    const account = walletService.getCurrentAccount();
    if (!account) throw new Error('No wallet connected');

    try {
      const listingIdBytes = Buffer.from(listingId.replace('0x', ''), 'hex');

      const transaction = await new ContractExecuteTransaction()
        .setContractId(HEDERA_CONFIG.contracts.energyTrading)
        .setGas(150000)
        .setFunction(
          'purchaseEnergy',
          new ContractFunctionParameters().addBytes32(listingIdBytes),
        )
        .freezeWith(this.client);

      const signedTx = await walletService.signTransaction(transaction);
      const response = await signedTx.execute(this.client);
      await response.getReceipt(this.client);

      return response.transactionId.toString();
    } catch (error) {
      console.error('Error purchasing energy:', error);
      throw new Error(`Failed to purchase energy: ${error}`);
    }
  }

  async getEnergyListing(listingId: string): Promise<EnergyListing> {
    try {
      const listingIdBytes = Buffer.from(listingId.replace('0x', ''), 'hex');

      const query = new ContractCallQuery()
        .setContractId(HEDERA_CONFIG.contracts.energyTrading)
        .setGas(50000)
        .setFunction(
          'getListing',
          new ContractFunctionParameters().addBytes32(listingIdBytes),
        );

      const result = await query.execute(this.client);

      return {
        listingId,
        seller: result.getAddress(0),
        energyAmount: result.getUint256(1).toNumber() / 100,
        pricePerKwh: result.getUint256(2).toNumber() / 100000000,
        expirationTime: result.getUint256(3).toNumber(),
        isActive: result.getBool(4),
        qualityHash: result.getBytes32(5).toString(),
      };
    } catch (error) {
      console.error('Error getting energy listing:', error);
      throw new Error(`Failed to get energy listing: ${error}`);
    }
  }

  async getActiveEnergyListings(): Promise<EnergyListing[]> {
    try {
      const response = await fetch(
        `${HEDERA_CONFIG.mirrorNodeUrl}/api/v1/contracts/${HEDERA_CONFIG.contracts.energyTrading}/results/logs?order=desc&limit=100`,
      );

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      const listings: EnergyListing[] = [];

      for (const log of data.logs || []) {
        try {
          const listing = await this.getEnergyListing(log.topics[1]);
          if (listing.isActive && listing.expirationTime > Date.now() / 1000) {
            listings.push(listing);
          }
        } catch (error) {
          console.error('Error fetching listing:', error);
        }
      }

      return listings;
    } catch (error) {
      console.error('Error getting active listings:', error);
      return [];
    }
  }

  // ==================== GOVERNANCE CONTRACT ====================

  async createProposal(
    title: string,
    description: string,
    votingPeriodDays: number,
  ): Promise<string> {
    const account = walletService.getCurrentAccount();
    if (!account) throw new Error('No wallet connected');

    try {
      const transaction = await new ContractExecuteTransaction()
        .setContractId(HEDERA_CONFIG.contracts.governance)
        .setGas(150000)
        .setFunction(
          'createProposal',
          new ContractFunctionParameters()
            .addString(title)
            .addString(description)
            .addUint256(votingPeriodDays * 24 * 60 * 60)
            .addUint256(2000)
            .addUint256(6000),
        )
        .freezeWith(this.client);

      const signedTx = await walletService.signTransaction(transaction);
      const response = await signedTx.execute(this.client);
      await response.getReceipt(this.client);

      return response.transactionId.toString();
    } catch (error) {
      console.error('Error creating proposal:', error);
      throw new Error(`Failed to create proposal: ${error}`);
    }
  }

  async castVote(
    proposalId: string,
    choice: 'yes' | 'no' | 'abstain',
  ): Promise<string> {
    const account = walletService.getCurrentAccount();
    if (!account) throw new Error('No wallet connected');

    try {
      const proposalIdBytes = Buffer.from(proposalId.replace('0x', ''), 'hex');
      const voteChoice = choice === 'yes' ? 0 : choice === 'no' ? 1 : 2;

      const transaction = await new ContractExecuteTransaction()
        .setContractId(HEDERA_CONFIG.contracts.governance)
        .setGas(100000)
        .setFunction(
          'castVote',
          new ContractFunctionParameters()
            .addBytes32(proposalIdBytes)
            .addUint8(voteChoice),
        )
        .freezeWith(this.client);

      const signedTx = await walletService.signTransaction(transaction);
      const response = await signedTx.execute(this.client);
      await response.getReceipt(this.client);

      return response.transactionId.toString();
    } catch (error) {
      console.error('Error casting vote:', error);
      throw new Error(`Failed to cast vote: ${error}`);
    }
  }

  async getActiveProposals(): Promise<Proposal[]> {
    try {
      const response = await fetch(
        `${HEDERA_CONFIG.mirrorNodeUrl}/api/v1/contracts/${HEDERA_CONFIG.contracts.governance}/results/logs?order=desc&limit=100`,
      );

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      const proposals: Proposal[] = [];

      for (const log of data.logs || []) {
        try {
          const proposal = await this.getProposal(log.topics[1]);
          if (proposal.status === 'Active' || proposal.status === 'Pending') {
            proposals.push(proposal);
          }
        } catch (error) {
          console.error('Error fetching proposal:', error);
        }
      }

      return proposals;
    } catch (error) {
      console.error('Error getting active proposals:', error);
      return [];
    }
  }

  private async getProposal(proposalId: string): Promise<Proposal> {
    const proposalIdBytes = Buffer.from(proposalId.replace('0x', ''), 'hex');

    const query = new ContractCallQuery()
      .setContractId(HEDERA_CONFIG.contracts.governance)
      .setGas(50000)
      .setFunction(
        'proposals',
        new ContractFunctionParameters().addBytes32(proposalIdBytes),
      );

    const result = await query.execute(this.client);

    return {
      proposalId,
      proposer: result.getAddress(0),
      title: result.getString(1),
      description: result.getString(2),
      votingStartTime: result.getUint256(3).toNumber(),
      votingEndTime: result.getUint256(4).toNumber(),
      status: this.mapProposalStatus(result.getUint8(7)),
      yesVotes: result.getUint256(8).toNumber(),
      noVotes: result.getUint256(9).toNumber(),
      quorumRequired: result.getUint256(5).toNumber(),
    };
  }

  // ==================== SERVICE PAYMENT CONTRACT ====================

  async processServicePayment(
    providerId: string,
    amount: number,
    serviceType: 'internet' | 'energy' | 'compute',
  ): Promise<string> {
    const account = walletService.getCurrentAccount();
    if (!account) throw new Error('No wallet connected');

    try {
      const serviceTypeMap = {internet: 0, energy: 1, compute: 2};

      const transaction = await new ContractExecuteTransaction()
        .setContractId(HEDERA_CONFIG.contracts.servicePayment)
        .setGas(150000)
        .setFunction(
          'processServicePayment',
          new ContractFunctionParameters()
            .addAddress(providerId)
            .addAddress(account.evmAddress)
            .addAddress(HEDERA_CONFIG.tokens.hnet.toSolidityAddress())
            .addUint256(Math.floor(amount * 100000000))
            .addUint8(serviceTypeMap[serviceType]),
        )
        .freezeWith(this.client);

      const signedTx = await walletService.signTransaction(transaction);
      const response = await signedTx.execute(this.client);
      await response.getReceipt(this.client);

      return response.transactionId.toString();
    } catch (error) {
      console.error('Error processing service payment:', error);
      throw new Error(`Failed to process service payment: ${error}`);
    }
  }

  // Helper methods
  private mapProposalStatus(status: number): Proposal['status'] {
    const statusMap: Proposal['status'][] = [
      'Pending',
      'Active',
      'Passed',
      'Rejected',
      'Executed',
    ];
    return statusMap[status] || 'Pending';
  }
}

export const smartContractService = new SmartContractService();