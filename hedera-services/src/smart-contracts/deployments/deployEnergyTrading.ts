import { ContractCreateFlow, ContractId, Client, ContractFunctionParameters } from '@hashgraph/sdk';
import { client } from '../../config';
import fs from 'fs';

const bytecode = fs.readFileSync('dist/contracts/EnergyTrading.bin', 'utf8');

export async function deployEnergyTradingContract(client: Client): Promise<ContractId> {
  const contractCreateTx = await new ContractCreateFlow()
    .setBytecode(bytecode)
    .setGas(100000)
    .setConstructorParameters(
      new ContractFunctionParameters()
        .addAddress('0x...HEC')
        .addAddress('0x...HNET')
    )
    .execute(client);

  const contractCreateRx = await contractCreateTx.getReceipt(client);
  return contractCreateRx.contractId;
}

// Usage similar to above
if (require.main === module) {
  (async () => {
    try {
      const contractId = await deployEnergyTradingContract(client);
      console.log(`Energy Trading Deployed: ${contractId.toString()}`);
    } catch (error) {
      console.error('Deployment error:', error);
    } finally {
      await client.close();
    }
  })();
}