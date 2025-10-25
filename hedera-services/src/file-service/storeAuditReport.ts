import {
  FileCreateTransaction,
  FileId,
  PrivateKey,
  Client
} from "@hashgraph/sdk";
import { client, adminKey } from '../config';

const adminPrivateKey = PrivateKey.fromStringECDSA(adminKey);

export async function storeAuditReport(
  report: string, // JSON string for audit report
  fileId: string = '0.0.new'
): Promise<FileId> {
  if (fileId !== '0.0.new') {
    throw new Error('Audit reports are immutable; use new file for each report');
  }

  const fileCreateTx = await new FileCreateTransaction()
    .setContents(report)
    .setKeys([adminPrivateKey.publicKey])
    .setExpirationTime(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)) // 1 year
    .freezeWith(client);

  const fileCreateSign = await fileCreateTx.sign(adminPrivateKey);
  const fileCreateSubmit = await fileCreateSign.execute(client);
  const fileCreateRx = await fileCreateSubmit.getReceipt(client);

  const auditFileId = fileCreateRx.fileId!;
  console.log(`Audit report stored in File ID: ${auditFileId.toString()}`);
  return auditFileId;
}

// Usage
if (require.main === module) {
  (async () => {
    try {
      const report = JSON.stringify({
        accountId: '0.0.123',
        period: { start: Date.now() - 86400000, end: Date.now() },
        serviceDelivery: { uptime: 99.5 },
        consensusProof: ['timestamp1']
      });
      const fileId = await storeAuditReport(report);
      console.log(`Stored: ${fileId.toString()}`);
    } catch (error) {
      console.error('Error storing audit:', error);
    } finally {
      await client.close();
    }
  })();
}