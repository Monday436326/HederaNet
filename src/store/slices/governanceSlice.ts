// src/store/slices/governanceSlice.ts - FINAL PRODUCTION VERSION
import {createSlice, createAsyncThunk} from '@reduxjs/toolkit';
import {GovernanceState} from '../types';
import {smartContractService} from '../../services/hedera/SmartContractService';
import {hcsService} from '../../services/hedera/HCSService';
import {hederaTokenService} from '../../services/hedera/TokenService';
import {walletService} from '../../services/hedera/WalletService';
// import {HEDERA_CONFIG} from '../../config/hedera.config';

const initialState: GovernanceState = {
  proposals: [],
  votingPower: 0,
  reputationScore: 0,
  votesCast: 0,
  loading: false,
  error: null,
};

export const fetchProposals = createAsyncThunk(
  'governance/fetchProposals',
  async (_, {rejectWithValue}) => {
    try {
      const proposals = await smartContractService.getActiveProposals();
      return proposals;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch proposals');
    }
  },
);

export const fetchUserGovernanceStats = createAsyncThunk(
  'governance/fetchUserStats',
  async (_, {rejectWithValue}) => {
    try {
      const account = walletService.getCurrentAccount();
      if (!account) throw new Error('No wallet connected');

      const tokenBalances = await hederaTokenService.getHederaNetTokenBalances(
        account.accountId,
      );
      const votingPower = tokenBalances.hnet.balance;

      const governanceHistory = await hcsService.getGovernanceHistory(500);
      const votesCast = governanceHistory.filter(
        msg => msg.type === 'vote_cast' && msg.voter === account.accountId,
      ).length;

      // Calculate reputation score based on activity
      const reputationScore = Math.min(100, 50 + votesCast * 5);

      return {votingPower, votesCast, reputationScore};
    } catch (error: any) {
      return rejectWithValue(
        error.message || 'Failed to fetch governance stats',
      );
    }
  },
);

export const createProposal = createAsyncThunk(
  'governance/createProposal',
  async (
    {
      title,
      description,
      votingPeriodDays,
    }: {
      title: string;
      description: string;
      votingPeriodDays: number;
    },
    {rejectWithValue, dispatch},
  ) => {
    try {
      const account = walletService.getCurrentAccount();
      if (!account) throw new Error('No wallet connected');

      const proposalId = await smartContractService.createProposal(
        title,
        description,
        votingPeriodDays,
      );

      await hcsService.submitGovernanceAction({
        type: 'proposal_created',
        proposalId,
        timestamp: Date.now(),
      });

      dispatch(fetchProposals());

      return proposalId;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to create proposal');
    }
  },
);

export const castVote = createAsyncThunk(
  'governance/castVote',
  async (
    {
      proposalId,
      choice,
    }: {
      proposalId: string;
      choice: 'yes' | 'no' | 'abstain';
    },
    {rejectWithValue, dispatch, getState},
  ) => {
    try {
      const account = walletService.getCurrentAccount();
      if (!account) throw new Error('No wallet connected');

      const state = getState() as any;
      const votingPower = state.governance.votingPower;

      const txId = await smartContractService.castVote(proposalId, choice);

      await hcsService.submitGovernanceAction({
        type: 'vote_cast',
        proposalId,
        voter: account.accountId,
        choice,
        votingPower,
        timestamp: Date.now(),
      });

      dispatch(fetchProposals());
      dispatch(fetchUserGovernanceStats());

      return txId;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to cast vote');
    }
  },
);

export const subscribeToGovernanceEvents = createAsyncThunk(
  'governance/subscribe',
  async (_, {dispatch}) => {
    try {
      await hcsService.subscribeToGovernance(message => {
        if (
          message.type === 'proposal_created' ||
          message.type === 'vote_cast' ||
          message.type === 'proposal_executed'
        ) {
          dispatch(fetchProposals());
        }
      });
    } catch (error) {
      console.error('Error subscribing to governance events:', error);
    }
  },
);

export const getProposalVoteHistory = createAsyncThunk(
  'governance/getVoteHistory',
  async (proposalId: string, {rejectWithValue}) => {
    try {
      const history = await hcsService.getGovernanceHistory(500);

      const votes = history.filter(
        msg => msg.type === 'vote_cast' && msg.proposalId === proposalId,
      );

      return votes;
    } catch (error: any) {
      return rejectWithValue(
        error.message || 'Failed to get vote history',
      );
    }
  },
);

export const checkUserVote = createAsyncThunk(
  'governance/checkUserVote',
  async (proposalId: string, {rejectWithValue}) => {
    try {
      const account = walletService.getCurrentAccount();
      if (!account) return null;

      const history = await hcsService.getGovernanceHistory(500);

      const userVote = history.find(
        msg =>
          msg.type === 'vote_cast' &&
          msg.proposalId === proposalId &&
          msg.voter === account.accountId,
      );

      return userVote ? userVote.choice : null;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to check user vote');
    }
  },
);

const governanceSlice = createSlice({
  name: 'governance',
  initialState,
  reducers: {
    clearError: state => {
      state.error = null;
    },
    updateProposal: (state, action) => {
      const index = state.proposals.findIndex(
        p => p.proposalId === action.payload.proposalId,
      );
      if (index !== -1) {
        state.proposals[index] = action.payload;
      }
    },
  },
  extraReducers: builder => {
    builder
      .addCase(fetchProposals.pending, state => {
        state.loading = true;
      })
      .addCase(fetchProposals.fulfilled, (state, action) => {
        state.loading = false;
        state.proposals = action.payload;
      })
      .addCase(fetchProposals.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchUserGovernanceStats.fulfilled, (state, action) => {
        state.votingPower = action.payload.votingPower;
        state.votesCast = action.payload.votesCast;
        state.reputationScore = action.payload.reputationScore;
      })
      .addCase(createProposal.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createProposal.fulfilled, state => {
        state.loading = false;
      })
      .addCase(createProposal.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(castVote.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(castVote.fulfilled, state => {
        state.loading = false;
      })
      .addCase(castVote.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const {clearError, updateProposal} = governanceSlice.actions;
export default governanceSlice.reducer;