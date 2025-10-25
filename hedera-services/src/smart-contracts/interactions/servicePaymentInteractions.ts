import { ContractExecuteTransaction, Client, PrivateKey, ContractFunctionParameters } from '@hashgraph/sdk';
import { client } from '../../config';

const SERVICE_PAYMENT_CONTRACT_ID = ''; 
const consumerKey = PrivateKey.fromStringECDSA(process.env.CONSUMER_KEY || '');

export async function processServicePayment(
  provider: string,
  consumer: string,
  amount: number,
  serviceType: number
): Promise<void> {
  const contractExecuteTx = await new ContractExecuteTransaction()
    .setContractId(SERVICE_PAYMENT_CONTRACT_ID)
    .setGas(75000)
    .setFunction(
      "processServicePayment",
      new ContractFunctionParameters()
        .addAddress(provider)
        .addAddress(consumer)
        .addAddress('0x...HNET')
        .addUint256(amount)
        .addUint8(serviceType)
    )
    .freezeWith(client);

  const contractExecuteSign = await contractExecuteTx.sign(consumerKey);
  await contractExecuteSign.execute(client);
}

// Usage
if (require.main === module) {
  const args = process.argv.slice(2);
  const provider = args[0] || '0x...';
  const amount = parseInt(args[1]) || 1000;
  (async () => {
    try {
      await processServicePayment(provider, '0x...consumer', amount, 0);
      console.log('Payment processed');
    } catch (error) {
      console.error('Payment error:', error);
    } finally {
      await client.close();
    }
  })();
}