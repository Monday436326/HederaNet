import { ContractCreateFlow, ContractId, Client, PrivateKey, AccountId, ContractFunctionParameters } from '@hashgraph/sdk';
import { client } from '../../config';
import fs from 'fs';

const bytecode = fs.readFileSync('dist/contracts/ServicePayment_sol_ServicePaymentContract.bin', 'utf8'); // Assume compiled




export async function deployServicePaymentContract(client: Client): Promise<ContractId> {
  // Compile contract bytecode (placeholder; use solc in build)
  
  // Deploy contract
  const contractCreateTx = await new ContractCreateFlow()
    .setBytecode(bytecode)
    .setGas(10000000)
    .setConstructorParameters(
      new ContractFunctionParameters()
        .addAddress('0x413df10937325724e104207bec5079e158f49799') // treasuryAccountId.toSolidityAddress()
        .addAddress('0x413df10937325724e104207bec5079e158f49799') // platformAccountId.toSolidityAddress()
    )
    .execute(client);

  const contractCreateRx = await contractCreateTx.getReceipt(client);
  if (!contractCreateRx.contractId) {
    throw new Error('Failed to get contract ID from receipt');
  }
  return contractCreateRx.contractId;
}

// Usage
if (require.main === module) {
  (async () => {
    try {
      const contractId = await deployServicePaymentContract(client);
      console.log(`Service Payment Deployed: ${contractId.toString()}`);
    } catch (error) {
      console.error('Deployment error:', error);
    } finally {
      await client.close();
    }
  })();
}