# HederaNet
HederaNet transforms ordinary community members into infrastructure entrepreneurs through a DePIN that enables communities to own and operate their internet, energy, and compute services.

This repository contains production-level implementations of Hedera services integrations for HederaNet, a community-owned DePIN (Decentralized Physical Infrastructure Network) leveraging Hedera Hashgraph for tokens, consensus, smart contracts, and file storage. It includes code for:

- **Hedera Token Service (HTS)**: Multi-token economy with HNET (utility), HEC (energy credits), HCC (compute credits), and Reputation NFTs.
- **Hedera Consensus Service (HCS)**: Immutable logging for service quality, governance actions, and energy trades.
- **Hedera Smart Contract Service (HSCS)**: Automated contracts for service payments, energy trading, and governance.
- **Hedera File Service (HFS)**: Decentralized data storage for metadata, audit reports, and configuration files.

The code is written in TypeScript (for HTS/HCS/HFS interactions) and Solidity (for HSCS contracts), using the official Hedera SDK. It's designed for mainnet/testnet deployment with error handling, gas optimization, monitoring, and testing.

## Services Implemented

### 1. Hedera Token Service (HTS)
- **HNET Token**: Finite supply utility token with royalty fees and vesting.
- **HEC (Energy Credits)**: Infinite supply, minted on verified energy generation, with metadata for provenance.
- **HCC (Compute Credits)**: Infinite supply, issued based on compute performance metrics.
- **Reputation NFTs**: Soulbound NFTs for achievements, non-transferable and revocable.

**Implementation**: Uses `@hashgraph/sdk` for token creation, minting, transfers, and associations. Supports multi-token transfers and atomic swaps.

### 2. Hedera Consensus Service (HCS)
- **Service Quality Log Topic**: Logs metrics like uptime and ratings with signed messages.
- **Governance Actions Topic**: Records proposals, votes, and executions.
- **Energy Trading Topic**: Tracks listings, trades, and deliveries.

**Implementation**: Topic creation, message submission, subscription, and querying with signature verification.

### 3. Hedera Smart Contract Service (HSCS)
- **Service Payment Contract**: Automates payments with distribution (70% provider, 15% model dev, 10% platform, 5% community).
- **Energy Trading Contract**: P2P listings, purchases, and market pricing.
- **Governance Contract**: Proposal creation, voting (token + reputation weighted), and finalization.

**Implementation**: Solidity contracts deployed via SDK, with TypeScript wrappers for interactions. Uses HederaTokenService for native token integration.

### 4. Hedera File Service (HFS)
- **Metadata Storage**: Upload JSON metadata for tokens/NFTs (e.g., badge images, energy proofs).
- **Audit Report Storage**: Store immutable audit trails and performance reports.
- **Configuration Files**: Persistent storage for network configs and service parameters.

**Implementation**: File creation, content appending/updating, and retrieval using `@hashgraph/sdk`. Supports chunked uploads for large files and access control via keys.

## How to Run

### Prerequisites
- Node.js 18+
- Hedera SDK: `npm install @hashgraph/sdk`
- Solidity compiler: `npm install solc`
- Environment variables: Set `HEdera_NETWORK` (testnet/mainnet), operator keys, etc., in `.env`.
- For contracts: Hardhat or Foundry for compilation (not included; use SDK directly).

### Setup
1. Clone repo: `git clone <repo-url>`
2. Install deps: `npm install`
3. Configure: Copy `.env.example` to `.env` and fill values (e.g., `OPERATOR_ID=0.0.123`, `OPERATOR_KEY=...`).
4. Build: `npm run build` (compiles TS and Solidity).

### Running Services

#### HTS (Tokens)
- Create HNET: `npm run token:create-hnet`
- Mint HEC: `npm run token:mint-hec -- --amount=100 --proof=...`
- Transfer: `npm run token:transfer -- --token=HNET --from=0.0.123 --to=0.0.456 --amount=1000`
- Full script: `ts-node src/tokens/HNET.ts`

#### HCS (Consensus)
- Create topics: `npm run consensus:create-topics`
- Submit message: `npm run consensus:submit -- --topic=service-quality --message='{"uptime":99.5}'`
- Subscribe: `npm run consensus:subscribe -- --topic=service-quality`
- Full script: `ts-node src/consensus/ServiceQualityTopic.ts`

#### HSCS (Smart Contracts)
- Deploy contracts:
  - Service Payment: `npm run sc:deploy-service-payment`
  - Energy Trading: `npm run sc:deploy-energy-trading`
  - Governance: `npm run sc:deploy-governance`
- Interact:
  - Process payment: `npm run sc:interact-payment -- --provider=0x... --amount=1000`
  - Create listing: `npm run sc:interact-energy -- --action=create --amount=100 --price=0.1`
  - Create proposal: `npm run sc:interact-gov -- --action=propose --title="Upgrade" --desc="..."`

#### HFS (File Service)
- Upload metadata: `npm run file:upload-metadata -- --content='{"name":"Badge"}' --fileId=0.0.2001`
- Store audit report: `npm run file:store-audit -- --report='{"metrics":{}}' --fileId=0.0.2002`
- Retrieve file: `npm run file:retrieve -- --fileId=0.0.2001`
- Full script: `ts-node src/file-service/uploadMetadata.ts`

### Testnet Deployments
HNET_TOKEN_ID=0.0.7153593
HEC_TOKEN_ID=0.0.7153605
HCC_TOKEN_ID=0.0.7153651
REPUTATION_NFT_ID=0.0.7153666 
ENERGY_TRADING_CONTRACT_ID=0.0.7153712
SERVICE_PAYMENT_CONTRACT_ID=0.0.7153764
GOVERNANCE_CONTRACT_ID=0.0.7153782
