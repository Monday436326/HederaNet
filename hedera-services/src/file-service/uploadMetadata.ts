import {
  FileCreateTransaction,
  FileAppendTransaction,
  FileContentsQuery,
  FileId,
  PrivateKey,
  Client,
  TransactionId
} from "@hashgraph/sdk";
import { client, adminKey } from '../config';

const adminPrivateKey = PrivateKey.fromStringECDSA(adminKey);

export async function uploadMetadata(
  content: string, // JSON string for metadata
  fileId: string // Existing file ID or new
): Promise<FileId | TransactionId> {
  try {
    let targetFileId: FileId;

    if (fileId === '0.0.new') {
      // Create new file
      const fileCreateTx = await new FileCreateTransaction()
        .setContents(content)
        .setKeys([adminPrivateKey.publicKey])
        .freezeWith(client);

      const fileCreateSign = await fileCreateTx.sign(adminPrivateKey);
      const fileCreateSubmit = await fileCreateSign.execute(client);
      const fileCreateRx = await fileCreateSubmit.getReceipt(client);
      targetFileId = fileCreateRx.fileId!;
    } else {
      // Append to existing file (for updates)
      targetFileId = FileId.fromString(fileId);
      const fileAppendTx = await new FileAppendTransaction()
        .setFileId(targetFileId)
        .setContents(`\n${content}`) // Append with separator
        .freezeWith(client);

      const fileAppendSign = await fileAppendTx.sign(adminPrivateKey);
      const fileAppendSubmit = await fileAppendSign.execute(client);
      return fileAppendSubmit.transactionId;
    }

    console.log(`Metadata uploaded to File ID: ${targetFileId.toString()}`);
    return targetFileId;
  } catch (error) {
    throw new Error(`Upload failed: ${error}`);
  }
}

// Usage: ts-node src/file-service/uploadMetadata.ts
if (require.main === module) {
  const args = process.argv.slice(2);
  const content = args[0] || '{"name": "Sample Badge Metadata", "description": "Test"}';
  const fileId = args[1] || '0.0.new';
  (async () => {
    try {
      const result = await uploadMetadata(content, fileId);
      console.log(`Result: ${result}`);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      await client.close();
    }
  })();
}