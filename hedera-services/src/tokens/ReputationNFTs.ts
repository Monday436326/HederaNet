import { 
  TokenMintTransaction,
  PrivateKey
} from "@hashgraph/sdk";
import { client, supplyKey } from '../config';

const REPUTATION_NFT_ID = '0.0.1004'; // Assume pre-created
const supplyPrivateKey = PrivateKey.fromStringECDSA(supplyKey);

interface BadgeMetadata {
  category: string;
  tier: string;
  awardDate: number;
  achievementScore: number;
  achievementDetails: string;
  issuer: string;
}

export async function mintReputationBadge(
  recipient: string,
  metadata: BadgeMetadata
): Promise<number> {
  // Create unique NFT metadata
  const nftMetadata = Buffer.from(JSON.stringify({
    name: `${metadata.tier} ${metadata.category} Badge`,
    description: metadata.achievementDetails,
    image: `ipfs://placeholder`, // await uploadBadgeImage(metadata)
    attributes: [
      { trait_type: "Category", value: metadata.category },
      { trait_type: "Tier", value: metadata.tier },
      { trait_type: "Score", value: metadata.achievementScore },
      { trait_type: "Date", value: new Date(metadata.awardDate).toISOString() }
    ]
  }));

  const mintTx = await new TokenMintTransaction()
    .setTokenId(REPUTATION_NFT_ID)
    .setMetadata([nftMetadata])
    .freezeWith(client);

  const mintSign = await mintTx.sign(supplyPrivateKey);
  const mintSubmit = await mintSign.execute(client);
  const mintRx = await mintSubmit.getReceipt(client);

  // Associate and transfer to recipient (placeholder)
  console.log(`Associate and transfer serial: ${mintRx.serials[0]}`);

  return mintRx.serials[0];
}

// Usage example
if (require.main === module) {
  (async () => {
    try {
      const serial = await mintReputationBadge('0.0.789', {
        category: "ServiceReliability",
        tier: "Gold",
        awardDate: Date.now(),
        achievementScore: 95,
        achievementDetails: "High uptime",
        issuer: "Governance"
      });
      console.log(`Badge Minted: Serial ${serial}`);
    } catch (error) {
      console.error('Error minting badge:', error);
    } finally {
      await client.close();
    }
  })();
}