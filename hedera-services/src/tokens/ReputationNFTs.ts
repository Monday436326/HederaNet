import { 
  TokenCreateTransaction, 
  TokenType, 
  TokenSupplyType,
  CustomRoyaltyFee,
  Hbar,
  CustomFixedFee,
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

let REPUTATION_NFT_ID: string; // Set after creation

interface BadgeMetadata {
  category: string;
  tier: string;
  awardDate: number;
  achievementScore: number;
  achievementDetails: string;
  issuer: string;
}

export async function createReputationNFT(client: Client): Promise<TokenId> {
  // Create royalty fee: 5% on transfers (NFT-specific), fallback 0.0001 HBAR
  const royaltyFee = new CustomRoyaltyFee()
    .setNumerator(5)
    .setDenominator(100)
    .setFallbackFee(new CustomFixedFee().setHbarAmount(new Hbar(0.0001)))
    .setFeeCollectorAccountId(AccountId.fromString(treasuryAccountId));

  // Create NFT token
  const tokenCreateTx = await new TokenCreateTransaction()
    .setTokenName("HederaNet Reputation Badge")
    .setTokenSymbol("HRB")
    .setDecimals(0)
    .setInitialSupply(0)
    .setTreasuryAccountId(AccountId.fromString(treasuryAccountId))
    .setAdminKey(adminPrivateKey.publicKey)
    .setSupplyKey(supplyPrivateKey.publicKey)
    .setTokenType(TokenType.NonFungibleUnique)
    .setSupplyType(TokenSupplyType.Infinite)
    .setCustomFees([royaltyFee])
    .freezeWith(client);

  const tokenCreateSign = await tokenCreateTx.sign(adminPrivateKey);
  const tokenCreateSubmit = await tokenCreateSign.execute(client);
  const tokenCreateRx = await tokenCreateSubmit.getReceipt(client);
  
  if (!tokenCreateRx.tokenId) {
    throw new Error("Token creation failed: tokenId is null");
  }

  REPUTATION_NFT_ID = tokenCreateRx.tokenId.toString();
  console.log(`Reputation NFT Created: ${REPUTATION_NFT_ID}`);
  return tokenCreateRx.tokenId;
}

export async function mintReputationBadge(
  recipient: string,
  metadata: BadgeMetadata
): Promise<number> {
  if (!REPUTATION_NFT_ID) {
    throw new Error("Reputation NFT not created. Run create first.");
  }

  // Create unique NFT metadata (JSON for attributes)
  const nftMetadata = Buffer.from(JSON.stringify({
    name: `${metadata.tier} ${metadata.category} Badge`,
    description: metadata.achievementDetails,
    image: `ipfs://placeholder`, // Replace with actual IPFS upload
    attributes: [
      { trait_type: "Category", value: metadata.category },
      { trait_type: "Tier", value: metadata.tier },
      { trait_type: "Score", value: metadata.achievementScore },
      { trait_type: "Date", value: new Date(metadata.awardDate).toISOString() },
      { trait_type: "Issuer", value: metadata.issuer }
    ]
  }));

  // Mint NFT (1 serial per badge)
  const mintTx = await new TokenMintTransaction()
    .setTokenId(REPUTATION_NFT_ID)
    .setMetadata([nftMetadata])
    .freezeWith(client);

  const mintSign = await mintTx.sign(supplyPrivateKey);
  const mintSubmit = await mintSign.execute(client);
  const mintRx = await mintSubmit.getReceipt(client);

  if (!mintRx.status._code) {
    throw new Error(`Mint failed: ${mintRx.status}`);
  }

  const serial = mintRx.serials[0]; // First (and only) serial

  // Associate recipient if not already
  await new TokenAssociateTransaction()
    .setAccountId(AccountId.fromString(recipient))
    .setTokenIds([REPUTATION_NFT_ID])
    .freezeWith(client)
    .execute(client);

  // Transfer NFT from treasury to recipient
  const transferTx = await new TransferTransaction()
    .addNftTransfer(REPUTATION_NFT_ID, serial, AccountId.fromString(treasuryAccountId), AccountId.fromString(recipient))
    .freezeWith(client)
    .execute(client);

  console.log(`Badge Minted & Transferred: Serial ${serial.toNumber()} to ${recipient}. Tx: ${mintSubmit.transactionId.toString()}`);
  return serial.toNumber();
}

// Usage: Handles 'create' or mint args
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];
  (async () => {
    try {
      if (command === 'create') {
        await createReputationNFT(client);
      } else {
        const recipient = args[0] || '0.0.789';
        const badgeData = {
          category: args[1] || "ServiceReliability",
          tier: args[2] || "Gold",
          awardDate: Date.now(),
          achievementScore: parseInt(args[3]) || 95,
          achievementDetails: args[4] || "High uptime",
          issuer: args[5] || "Governance"
        };
        const serial = await mintReputationBadge(recipient, badgeData);
        console.log(`Badge Minted: Serial ${serial}`);
      }
    } catch (error) {
      console.error('Error minting badge:', error);
    } finally {
      await client.close();
    }
  })();
}