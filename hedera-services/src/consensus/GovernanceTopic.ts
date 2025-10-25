import { 
  TopicMessageSubmitTransaction
} from "@hashgraph/sdk";
import { client } from '../config';

const GOVERNANCE_TOPIC_ID = '0.0.1006'; // Assume pre-created

interface GovernanceMessage {
  type: string;
  proposalId?: string;
  voter?: string;
  choice?: string;
  votingPower?: number;
  executionDetails?: any;
  timestamp: number;
}

export async function logGovernanceAction(
  action: GovernanceMessage
): Promise<void> {
  const messageTx = await new TopicMessageSubmitTransaction()
    .setTopicId(GOVERNANCE_TOPIC_ID)
    .setMessage(JSON.stringify(action))
    .freezeWith(client);

  await messageTx.execute(client);
}

// Usage
if (require.main === module) {
  (async () => {
    try {
      await logGovernanceAction({
        type: 'vote_cast',
        proposalId: 'prop1',
        voter: '0.0.123',
        choice: 'yes',
        votingPower: 100,
        timestamp: Date.now()
      });
      console.log('Governance action logged');
    } catch (error) {
      console.error('Error logging governance:', error);
    } finally {
      await client.close();
    }
  })();
}