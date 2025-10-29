import { 
  TokenCreateTransaction, 
  TokenType, 
  TokenSupplyType,
  Hbar,
  Client,
  TokenId,
  PrivateKey,
  AccountId,
  TokenMintTransaction,
  TokenAssociateTransaction,
  TransferTransaction
} from "@hashgraph/sdk";
import { client, treasuryAccountId, adminKey, supplyKey } from '../config';

const adminPrivateKey = PrivateKey.fromStringECDSA(adminKey);
const supplyPrivateKey = PrivateKey.fromStringECDSA(supplyKey);

let HCC_TOKEN_ID: string; // Set after creation

interface ComputeMetrics {
  cpuModel: string;
  gpuModel: string;
  utilization: number;
  jobCount: number;
}

export function calculateComputeCredits(computeHours: number, metrics: ComputeMetrics): number {
  // Placeholder calculation
  return computeHours * metrics.utilization * 10;
}

export async function createHCCToken(client: Client): Promise<TokenId> {
  // Create token: Infinite supply, 6 decimals (for micro-credits), initial supply 0
  const tokenCreateTx = await new TokenCreateTransaction()
    .setTokenName("Hedera Compute Credits")
    .setTokenSymbol("HCC")
    .setDecimals(6)
    .setInitialSupply(0)
    .setTreasuryAccountId(AccountId.fromString(treasuryAccountId))
    .setAdminKey(adminPrivateKey.publicKey)
    .setSupplyKey(supplyPrivateKey.publicKey)
    .setTokenType(TokenType.FungibleCommon)
    .setSupplyType(TokenSupplyType.Infinite)  // Unlimited for compute rewards
    .freezeWith(client);

  const tokenCreateSign = await tokenCreateTx.sign(adminPrivateKey);
  const tokenCreateSubmit = await tokenCreateSign.execute(client);
  const tokenCreateRx = await tokenCreateSubmit.getReceipt(client);
  
  if (!tokenCreateRx.tokenId) {
    throw new Error("Token creation failed: tokenId is null");
  }

  HCC_TOKEN_ID = tokenCreateRx.tokenId.toString();
  console.log(`HCC Token Created: ${HCC_TOKEN_ID}`);
  return tokenCreateRx.tokenId;
}

export async function issueComputeCredits(
  computeProvider: string,
  computeHours: number,
  performanceMetrics: ComputeMetrics
): Promise<string> {  // Return txId
  if (!HCC_TOKEN_ID) {
    throw new Error("HCC token not created. Run create first.");
  }

  // Calculate credits
  const credits = calculateComputeCredits(computeHours, performanceMetrics);

  // Mint HCC to treasury (1 credit = 1 unit, with 6 decimals)
  const mintTx = await new TokenMintTransaction()
    .setTokenId(HCC_TOKEN_ID)
    .setAmount(credits * 1000000) // e.g., 10 credits = 10,000,000 units
    .freezeWith(client);

  const mintSign = await mintTx.sign(supplyPrivateKey);
  const mintSubmit = await mintSign.execute(client);
  const mintRx = await mintSubmit.getReceipt(client);

  if (!mintRx.status._code) {
    throw new Error(`Mint failed: ${mintRx.status}`);
  }

  // Associate provider account with HCC if not already
  await new TokenAssociateTransaction()
    .setAccountId(AccountId.fromString(computeProvider))
    .setTokenIds([HCC_TOKEN_ID])
    .freezeWith(client)
    .execute(client);

  // Transfer from treasury to provider
  const transferTx = await new TransferTransaction()
    .addTokenTransfer(HCC_TOKEN_ID, AccountId.fromString(treasuryAccountId), -(credits * 1000000))
    .addTokenTransfer(HCC_TOKEN_ID, AccountId.fromString(computeProvider), credits * 1000000)
    .freezeWith(client)
    .execute(client);

  console.log(`Issued ${credits} HCC to ${computeProvider} for ${computeHours} hours. Mint Tx: ${mintSubmit.transactionId.toString()}, Transfer Tx: ${transferTx.transactionId.toString()}`);
  return mintSubmit.transactionId.toString();
}

// Usage: Handles 'create' or issue args
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];
  (async () => {
    try {
      if (command === 'create') {
        await createHCCToken(client);
      } else {
        const hours = parseFloat(command) || parseFloat(args[0]) || 10;
        const provider = args[1] || '0.0.456';
        const metrics = {
          cpuModel: args[2] || 'ARM',
          gpuModel: args[3] || 'None',
          utilization: parseFloat(args[4]) || 0.8,
          jobCount: parseInt(args[5]) || 5
        };
        await issueComputeCredits(provider, hours, metrics);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      await client.close();
    }
  })();
}