import { ContractCreateFlow, ContractId, Client, ContractFunctionParameters } from '@hashgraph/sdk';
import { client } from '../../config';
import fs from 'fs';

const bytecode = fs.readFileSync('dist/contracts/Governance_sol_GovernanceContract.bin', 'utf8');

export async function deployGovernanceContract(client: Client): Promise<ContractId> {
  const contractCreateTx = await new ContractCreateFlow()
    .setBytecode(bytecode)
    .setGas(15000000)
    .setConstructorParameters(
      new ContractFunctionParameters()
        .addAddress('0x00000000000000000000000000000000006d27b9')
        .addAddress('0x00000000000000000000000000000000006d2802')
    )
    .execute(client);

  const contractCreateRx = await contractCreateTx.getReceipt(client);
  if (!contractCreateRx.contractId) {
    throw new Error('Failed to get contract ID from receipt');
  }
  return contractCreateRx.contractId;
}

// Usage similar
if (require.main === module) {
  (async () => {
    try {
      const contractId = await deployGovernanceContract(client);
      console.log(`Governance Deployed: ${contractId.toString()}`);
    } catch (error) {
      console.error('Deployment error:', error);
    } finally {
      await client.close();
    }
  })();
}