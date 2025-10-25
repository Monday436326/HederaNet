import { ContractCreateFlow, ContractId, Client, ContractFunctionParameters } from '@hashgraph/sdk';
import { client } from '../../config';
import fs from 'fs';

const bytecode = fs.readFileSync('dist/contracts/Governance.bin', 'utf8');

export async function deployGovernanceContract(client: Client): Promise<ContractId> {
  const contractCreateTx = await new ContractCreateFlow()
    .setBytecode(bytecode)
    .setGas(150000)
    .setConstructorParameters(
      new ContractFunctionParameters()
        .addAddress('0x...HNET')
        .addAddress('0x...reputation')
    )
    .execute(client);

  const contractCreateRx = await contractCreateTx.getReceipt(client);
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