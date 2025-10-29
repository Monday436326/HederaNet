import { ContractCreateFlow, ContractId, Client, ContractFunctionParameters } from '@hashgraph/sdk';
import { client } from '../../config';
import fs from 'fs';

const bytecode = fs.readFileSync('dist/contracts/EnergyTrading_sol_EnergyTradingContract.bin', 'utf8');

export async function deployEnergyTradingContract(client: Client): Promise<ContractId> {
  const contractCreateTx = await new ContractCreateFlow()
    .setBytecode(bytecode)
    .setGas(10000000)
    .setConstructorParameters(
      new ContractFunctionParameters()
        .addAddress('0x00000000000000000000000000000000006d27c5')
        .addAddress('0x00000000000000000000000000000000006d27b9')
    )
    .execute(client);

  const contractCreateRx = await contractCreateTx.getReceipt(client);
  if (!contractCreateRx.contractId) {
    throw new Error('Failed to get contract ID from receipt');
  }
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