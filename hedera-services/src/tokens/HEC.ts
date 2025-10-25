import { 
  TokenMintTransaction,
  PrivateKey,
  AccountId,
  TransactionId
} from "@hashgraph/sdk";
import { client, supplyKey } from '../config';

const HEC_TOKEN_ID = '0.0.1002'; // Assume pre-created
const supplyPrivateKey = PrivateKey.fromStringECDSA(supplyKey);

export async function mintEnergyCredits(
  amount: number, // kWh generated
  generatorAccount: string,
  verificationProof: string
): Promise<TransactionId> {
  // Verify energy generation with IoT oracle (placeholder)
  const verified = true; // await energyOracle.verifyGeneration(...);

  if (!verified) {
    throw new Error("Energy generation verification failed");
  }

  // Mint HEC tokens (1 token = 1 kWh)
  const mintTx = await new TokenMintTransaction()
    .setTokenId(HEC_TOKEN_ID)
    .setAmount(amount * 100) // Convert to token decimals
    .setMetadata([Buffer.from(JSON.stringify({
      generationTime: Date.now(),
      sourceType: "solar",
      carbonIntensity: 0,
      location: generatorAccount // Placeholder
    }))])
    .freezeWith(client);

  const mintSign = await mintTx.sign(supplyPrivateKey);
  const mintSubmit = await mintSign.execute(client);
  
  return mintSubmit.transactionId;
}

// Usage example
if (require.main === module) {
  const args = process.argv.slice(2);
  const amount = parseFloat(args[0]) || 100;
  (async () => {
    try {
      const txId = await mintEnergyCredits(amount, '0.0.123', 'proof');
      console.log(`HEC Minted: ${txId.toString()}`);
    } catch (error) {
      console.error('Error minting HEC:', error);
    } finally {
      await client.close();
    }
  })();
}