// src/config/hedera.config.ts
import {
  Client,
  AccountId,
  ContractId,
  TokenId,
  TopicId,
} from '@hashgraph/sdk';

export const HEDERA_CONFIG = {
  network: process.env.HEDERA_NETWORK || 'mainnet',
  mirrorNodeUrl: process.env.HEDERA_MIRROR_NODE_URL || 'https://mainnet-public.mirrornode.hedera.com',
  
  // Smart Contracts
  contracts: {
    energyTrading: ContractId.fromString(process.env.ENERGY_TRADING_CONTRACT_ID!),
    governance: ContractId.fromString(process.env.GOVERNANCE_CONTRACT_ID!),
    servicePayment: ContractId.fromString(process.env.SERVICE_PAYMENT_CONTRACT_ID!),
  },
  
  // Tokens
  tokens: {
    hnet: TokenId.fromString(process.env.HNET_TOKEN_ID!),
    hec: TokenId.fromString(process.env.HEC_TOKEN_ID!),
    hcc: TokenId.fromString(process.env.HCC_TOKEN_ID!),
    reputationNFT: TokenId.fromString(process.env.REPUTATION_NFT_ID!),
  },
  
  // HCS Topics
  topics: {
    governance: TopicId.fromString(process.env.GOVERNANCE_TOPIC_ID!),
    serviceQuality: TopicId.fromString(process.env.SERVICE_QUALITY_TOPIC_ID!),
    energyTrading: TopicId.fromString(process.env.ENERGY_TRADING_TOPIC_ID!),
  },
  
  // Accounts
  accounts: {
    treasury: AccountId.fromString(process.env.TREASURY_ACCOUNT_ID!),
    platform: AccountId.fromString(process.env.PLATFORM_ACCOUNT_ID!),
  },
};

export const getHederaClient = (): Client => {
  if (HEDERA_CONFIG.network === 'mainnet') {
    return Client.forMainnet();
  }
  return Client.forTestnet();
};