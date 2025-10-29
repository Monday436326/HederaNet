import {
  FileContentsQuery,
  FileId,
  Client,
  Hbar
} from "@hashgraph/sdk";
import { client } from '../config';

export async function retrieveFile(
  fileId: string
): Promise<string> {
  const query = new FileContentsQuery()
    .setFileId(FileId.fromString(fileId))
    .setMaxQueryPayment(new Hbar(0.0001)); // Tiny payment for query

  const contents = await query.execute(client);
  const content = contents.toString();
  console.log(`Retrieved content: ${content}`);
  return content;
}

// Usage
if (require.main === module) {
  const args = process.argv.slice(2);
  const fileId = args[0] || '0.0.2001';
  (async () => {
    try {
      await retrieveFile(fileId);
    } catch (error) {
      console.error('Error retrieving file:', error);
    } finally {
      await client.close();
    }
  })();
}