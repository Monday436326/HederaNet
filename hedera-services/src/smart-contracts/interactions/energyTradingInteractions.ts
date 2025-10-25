import { ContractExecuteTransaction, Client, ContractFunctionParameters } from '@hashgraph/sdk';
import { client } from '../../config';

const ENERGY_TRADING_CONTRACT_ID = '0.0.1009';

export async function createEnergyListing(
  amount: number,
  pricePerKwh: number,
  duration: number,
  qualityProof: string
): Promise<string> {
  const contractExecuteTx = new ContractExecuteTransaction()
      .setContractId(ENERGY_TRADING_CONTRACT_ID)
      .setGas(60000)
      .setFunction(
          "createListing",
          new ContractFunctionParameters()
              .addUint256(amount)
              .addUint256(pricePerKwh)
              .addUint256(duration)
              .addBytes32(qualityProof)
      )
      .freezeWith(client);

  await contractExecuteTx.execute(client); // Assume signed
  // Extract listingId from receipt/logs (placeholder)
  return 'listing_placeholder';
}
