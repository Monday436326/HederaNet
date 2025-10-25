import { 
  TopicMessageSubmitTransaction,
  TransactionId
} from "@hashgraph/sdk";
import { client } from '../config';

const ENERGY_TRADING_TOPIC_ID = '0.0.1007'; // Assume pre-created

interface EnergyTradeMessage {
  type: string;
  listingId?: string;
  seller?: string;
  buyer?: string;
  energyAmount: number;
  pricePerKwh: number;
  totalCost?: number;
  deliveryStatus?: string;
  timestamp: number;
}

export async function logEnergyTrade(
  trade: EnergyTradeMessage
): Promise<TransactionId> {
  const messageTx = await new TopicMessageSubmitTransaction()
    .setTopicId(ENERGY_TRADING_TOPIC_ID)
    .setMessage(JSON.stringify(trade))
    .setMaxChunks(10) // Support large messages if needed
    .freezeWith(client);

  const messageSubmit = await messageTx.execute(client);
  return messageSubmit.transactionId;
}

// Usage
if (require.main === module) {
  (async () => {
    try {
      const txId = await logEnergyTrade({
        type: 'trade_executed',
        listingId: 'list1',
        seller: '0.0.456',
        buyer: '0.0.789',
        energyAmount: 100,
        pricePerKwh: 0.1,
        totalCost: 10,
        deliveryStatus: 'completed',
        timestamp: Date.now()
      });
      console.log(`Trade logged: ${txId.toString()}`);
    } catch (error) {
      console.error('Error logging trade:', error);
    } finally {
      await client.close();
    }
  })();
}