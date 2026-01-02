// src/store/types.ts - FINAL PRODUCTION VERSION
import {WalletType} from '../services/hedera/WalletService';

export interface Token {
  tokenId: string;
  symbol: string;
  name: string;
  balance: number;
  decimals: number;
  usdValue: number;
  icon?: string;
}

export interface Transaction {
  id: string;
  type: 'send' | 'receive' | 'service' | 'energy' | 'compute' | 'contract';
  title: string;
  description: string;
  amount: number;
  token: string;
  tokenId: string;
  from: string;
  to: string;
  timestamp: string;
  status: 'pending' | 'completed' | 'failed';
  transactionHash: string;
  memo?: string;
}

export interface NetworkStatus {
  connection: 'connected' | 'disconnected';
  speed: number;
  uptime: number;
  activeNodes: number;
}

export interface EnergyListing {
  listingId: string;
  seller: string;
  energyAmount: number;
  pricePerKwh: number;
  expirationTime: number;
  isActive: boolean;
  qualityHash: string;
}

export interface InternetPlan {
  id: string;
  name: string;
  data: number;
  speed: number;
  price: number;
  current?: boolean;
}

export interface Proposal {
  proposalId: string;
  proposer: string;
  title: string;
  description: string;
  votingStartTime: number;
  votingEndTime: number;
  status: 'Pending' | 'Active' | 'Passed' | 'Rejected' | 'Executed';
  yesVotes: number;
  noVotes: number;
  abstainVotes?: number;
  quorumRequired: number;
  approvalThreshold?: number;
  votedYes?: boolean;
}

export interface WalletState {
  connected: boolean;
  accountId: string | null;
  evmAddress: string | null;
  publicKey: string | null;
  walletType: WalletType | null;
  balance: number;
  usdBalance: number;
  tokens: Token[];
  transactions: Transaction[];
  loading: boolean;
  error: string | null;
}

export interface EnergyState {
  generated: number;
  earned: number;
  listings: EnergyListing[];
  userListings: EnergyListing[];
  loading: boolean;
  error: string | null;
}

export interface GovernanceState {
  proposals: Proposal[];
  votingPower: number;
  reputationScore: number;
  votesCast: number;
  loading: boolean;
  error: string | null;
}

export interface RootState {
  wallet: WalletState;
  energy: EnergyState;
  governance: GovernanceState;
}

// HCS Message Types
export interface GovernanceMessage {
  type: 'vote_cast' | 'proposal_created' | 'proposal_executed';
  proposalId?: string;
  voter?: string;
  choice?: 'yes' | 'no' | 'abstain';
  votingPower?: number;
  timestamp: number;
  signature?: string;
}

export interface ServiceQualityMessage {
  providerId: string;
  serviceType: 'internet' | 'energy' | 'compute';
  timestamp: number;
  metrics: {
    uptime: number;
    throughput?: number;
    latency?: number;
    reliability?: number;
  };
  customerRating?: number;
  verificationProof: string;
}

export interface EnergyTradeMessage {
  type: 'trade_executed' | 'listing_created' | 'listing_cancelled';
  listingId?: string;
  seller?: string;
  buyer?: string;
  energyAmount: number;
  pricePerKwh: number;
  totalCost?: number;
  deliveryStatus?: string;
  timestamp: number;
}

// API Response Types
export interface TokenBalance {
  tokenId: string;
  symbol: string;
  name: string;
  balance: number;
  decimals: number;
  usdValue: number;
}

export interface TokenInfo {
  tokenId: string;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: string;
  treasuryAccount: string;
}