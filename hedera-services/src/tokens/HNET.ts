import { 
  TokenCreateTransaction, 
  TokenType, 
  TokenSupplyType,
  CustomFractionalFee,  // <-- CHANGED: Import FractionalFee instead of RoyaltyFee
  Hbar,
  Client,
  TokenId,
  PrivateKey,
  AccountId
} from "@hashgraph/sdk";
import { client, treasuryAccountId, adminKey, supplyKey } from '../config/index';

const treasuryKey = PrivateKey.fromStringECDSA(adminKey); // Assume ECDSA
const adminPrivateKey = PrivateKey.fromStringECDSA(adminKey);
const supplyPrivateKey = PrivateKey.fromStringECDSA(supplyKey);

export async function createHNETToken(client: Client): Promise<TokenId> {
  // Create token
  const tokenCreateTx = await new TokenCreateTransaction()
    .setTokenName("HederaNet Network Token")
    .setTokenSymbol("HNET")
    .setDecimals(8)
    .setInitialSupply(1000000000 * 100000000) // 1B with 8 decimals (1e17 total units)
    .setTreasuryAccountId(AccountId.fromString(treasuryAccountId))
    .setAdminKey(adminPrivateKey.publicKey)
    .setSupplyKey(supplyPrivateKey.publicKey)
    .setTokenType(TokenType.FungibleCommon)
    .setSupplyType(TokenSupplyType.Finite)
    .setMaxSupply(1000000000 * 100000000)
    .freezeWith(client);

  const tokenCreateSign = await tokenCreateTx.sign(treasuryKey);
  const tokenCreateSubmit = await tokenCreateSign.execute(client);
  const tokenCreateRx = await tokenCreateSubmit.getReceipt(client);
  
  if (!tokenCreateRx.tokenId) {
    throw new Error("Token creation failed: tokenId is null");
  }
  return tokenCreateRx.tokenId;
}

// Vesting and distribution logic can be added here
// Usage: node -r ts-node/register src/tokens/HNET.ts create
if (require.main === module) {
  (async () => {
    try {
      const tokenId = await createHNETToken(client);
      console.log(`HNET Token Created: ${tokenId.toString()}`);
    } catch (error) {
      console.error('Error creating HNET:', error);
    } finally {
      await client.close();
    }
  })();
}