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
  TransferTransaction,

} from "@hashgraph/sdk";
import { client, treasuryAccountId, adminKey, supplyKey } from '../config';

const adminPrivateKey = PrivateKey.fromStringECDSA(adminKey);
const supplyPrivateKey = PrivateKey.fromStringECDSA(supplyKey);

// let HEC_TOKEN_ID: string; // Will be set after creation
const HEC_TOKEN_ID = process.env.HEC_TOKEN_ID || '';


// export async function createHECToken(client: Client): Promise<TokenId> {
//   // Create token: Infinite supply, 2 decimals (for kWh * 100), initial supply 0
//   const tokenCreateTx = await new TokenCreateTransaction()
//     .setTokenName("Hedera Energy Credits")
//     .setTokenSymbol("HEC")
//     .setDecimals(2)
//     .setInitialSupply(0)
//     .setTreasuryAccountId(AccountId.fromString(treasuryAccountId))
//     .setAdminKey(adminPrivateKey.publicKey)
//     .setSupplyKey(supplyPrivateKey.publicKey)
//     .setTokenType(TokenType.FungibleCommon)
//     .setSupplyType(TokenSupplyType.Infinite)  // Unlimited minting for credits
//     .freezeWith(client);

//   const tokenCreateSign = await tokenCreateTx.sign(adminPrivateKey);
//   const tokenCreateSubmit = await tokenCreateSign.execute(client);
//   const tokenCreateRx = await tokenCreateSubmit.getReceipt(client);
  
//   if (!tokenCreateRx.tokenId) {
//     throw new Error("Token creation failed: tokenId is null");
//   }

//   HEC_TOKEN_ID = tokenCreateRx.tokenId.toString();
//   console.log(`HEC Token Created: ${HEC_TOKEN_ID}`);
//   return tokenCreateRx.tokenId;
// }

export async function mintEnergyCredits(
  amount: number, // kWh generated
  generatorAccount: string,
  verificationProof: string
): Promise<string> {  // Return minted amount or txId
  if (!HEC_TOKEN_ID) {
    throw new Error("HEC token not created. Run create first.");
  }

  // Verify energy generation with oracle (placeholder)
  const verified = true; // await energyOracle.verifyGeneration(amount, generatorAccount, verificationProof);

  if (!verified) {
    throw new Error("Energy generation verification failed");
  }

  // Mint HEC tokens to treasury (1 token = 1 kWh, with 2 decimals)
  const mintTx = await new TokenMintTransaction()
    .setTokenId(HEC_TOKEN_ID)
    .setAmount(amount * 100) // e.g., 100 kWh = 10000 units
    .freezeWith(client);

  const mintSign = await mintTx.sign(supplyPrivateKey);
  const mintSubmit = await mintSign.execute(client);
  const mintRx = await mintSubmit.getReceipt(client);

  if (!mintRx.status._code) {  // SUCCESS is 0, but check for errors
    throw new Error(`Mint failed: ${mintRx.status}`);
  }

  // Associate generator account with HEC if not already (idempotent)
  const associateTx = await new TokenAssociateTransaction()
    .setAccountId(AccountId.fromString(generatorAccount))
    .setTokenIds([HEC_TOKEN_ID])
    .freezeWith(client)
    .execute(client);

  // Transfer minted amount from treasury to generator
  const transferTx = await new TransferTransaction()
    .addTokenTransfer(HEC_TOKEN_ID, AccountId.fromString(treasuryAccountId), -(amount * 100))
    .addTokenTransfer(HEC_TOKEN_ID, AccountId.fromString(generatorAccount), amount * 100)
    .freezeWith(client)
    .execute(client);

  console.log(`Minted and transferred ${amount} kWh HEC to ${generatorAccount}. Mint Tx: ${mintSubmit.transactionId.toString()}, Transfer Tx: ${transferTx.transactionId.toString()}`);
  return mintSubmit.transactionId.toString();
}

// Usage: Handles 'create' or mint args
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];
  (async () => {
    try {
      if (command === 'create') {
        console.log('HEC Token creation is disabled in this script.');
        // await createHECToken(client);
      } else {
        const amount = parseFloat(command) || parseFloat(args[0]) || 100;  // First arg as amount if not 'create'
        const generator = args[1] || '0.0.123';
        const proof = args[2] || 'proof';
        await mintEnergyCredits(amount, generator, proof);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      await client.close();
    }
  })();
}