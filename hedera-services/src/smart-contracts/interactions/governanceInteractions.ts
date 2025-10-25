import { ContractExecuteTransaction, Client, PrivateKey, ContractFunctionParameters } from '@hashgraph/sdk';
import { client } from '../../config';

const GOVERNANCE_CONTRACT_ID = '0.0.1010';
const proposerKey = PrivateKey.fromStringECDSA(process.env.PROPOSER_KEY || '');

export async function createGovernanceProposal(
  title: string,
  description: string,
  votingPeriodDays: number
): Promise<string> {
  const contractExecuteTx = await new ContractExecuteTransaction()
    .setContractId(GOVERNANCE_CONTRACT_ID)
    .setGas(100000)
    .setFunction(
      "createProposal",
      new ContractFunctionParameters()
        .addString(title)
        .addString(description)
        .addUint256(votingPeriodDays * 24 * 60 * 60)
        .addUint256(2000) // quorum
        .addUint256(6000) // threshold
    )
    .freezeWith(client);

  const contractExecuteSign = await contractExecuteTx.sign(proposerKey);
  const contractExecuteSubmit = await contractExecuteSign.execute(client);
  const contractExecuteRx = await contractExecuteSubmit.getRecord(client);
  
  // Extract proposal ID from logs (placeholder)
  return 'prop_placeholder';
}
