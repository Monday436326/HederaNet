import { Client, ClientForMainnet, ClientForTestnet } from '@hashgraph/sdk';
import dotenv from 'dotenv';

dotenv.config();

const NETWORK = process.env.HEDERA_NETWORK || 'testnet';

export const client = NETWORK === 'mainnet' ? ClientForMainnet() : ClientForTestnet();

client.setOperator(
  process.env.OPERATOR_ID || '',
  process.env.OPERATOR_KEY || ''
);

export const treasuryAccountId = process.env.TREASURY_ID || '0.0.1001';
export const adminKey = process.env.ADMIN_KEY || '';
export const supplyKey = process.env.SUPPLY_KEY || '';