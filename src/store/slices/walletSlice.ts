// src/store/slices/walletSlice.ts - FINAL PRODUCTION VERSION
import {createSlice, createAsyncThunk, PayloadAction} from '@reduxjs/toolkit';
import {WalletState, Transaction} from '../types';
import {walletService, WalletType} from '../../services/hedera/WalletService';
import {hederaTokenService} from '../../services/hedera/TokenService';
import {transactionService} from '../../services/hedera/TransactionService';

const initialState: WalletState = {
  connected: false,
  accountId: null,
  evmAddress: null,
  publicKey: null,
  walletType: null,
  balance: 0,
  usdBalance: 0,
  tokens: [],
  transactions: [],
  loading: false,
  error: null,
};

export const connectWallet = createAsyncThunk(
  'wallet/connect',
  async (walletType: WalletType, {rejectWithValue}) => {
    try {
      let account;

      switch (walletType) {
        case WalletType.HASHPACK:
          account = await walletService.connectHashPack();
          break;
        case WalletType.BLADE:
          account = await walletService.connectBlade();
          break;
        case WalletType.METAMASK:
          account = await walletService.connectMetaMask();
          break;
        default:
          throw new Error('Unsupported wallet type');
      }

      return {account, walletType};
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to connect wallet');
    }
  },
);

export const disconnectWallet = createAsyncThunk(
  'wallet/disconnect',
  async () => {
    await walletService.disconnect();
  },
);

export const fetchBalances = createAsyncThunk(
  'wallet/fetchBalances',
  async (_, {rejectWithValue}) => {
    try {
      const account = walletService.getCurrentAccount();
      if (!account) throw new Error('No wallet connected');

      const hbarBalance = await hederaTokenService.getHbarBalance(
        account.accountId,
      );
      const tokenBalances = await hederaTokenService.getHederaNetTokenBalances(
        account.accountId,
      );

      const totalUsd =
        hbarBalance * 0.05 +
        tokenBalances.hnet.usdValue +
        tokenBalances.hec.usdValue +
        tokenBalances.hcc.usdValue;

      return {
        hbarBalance,
        tokens: [tokenBalances.hnet, tokenBalances.hec, tokenBalances.hcc],
        totalUsd,
      };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch balances');
    }
  },
);

export const fetchTransactions = createAsyncThunk(
  'wallet/fetchTransactions',
  async (limit: number = 50, {rejectWithValue}) => {
    try {
      const account = walletService.getCurrentAccount();
      if (!account) throw new Error('No wallet connected');

      const transactions = await transactionService.getAccountTransactions(
        account.accountId,
        limit,
      );

      return transactions;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch transactions');
    }
  },
);

export const sendTokens = createAsyncThunk(
  'wallet/sendTokens',
  async (
    {
      recipientId,
      amount,
      tokenId,
      decimals,
    }: {
      recipientId: string;
      amount: number;
      tokenId: string;
      decimals: number;
    },
    {rejectWithValue, dispatch},
  ) => {
    try {
      const txId = await hederaTokenService.transferToken(
        tokenId,
        recipientId,
        amount,
        decimals,
      );

      dispatch(fetchBalances());
      dispatch(fetchTransactions(50));

      return txId;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to send tokens');
    }
  },
);

export const sendHbar = createAsyncThunk(
  'wallet/sendHbar',
  async (
    {recipientId, amount}: {recipientId: string; amount: number},
    {rejectWithValue, dispatch},
  ) => {
    try {
      const txId = await hederaTokenService.transferHbar(recipientId, amount);

      dispatch(fetchBalances());
      dispatch(fetchTransactions(50));

      return txId;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to send HBAR');
    }
  },
);

export const associateToken = createAsyncThunk(
  'wallet/associateToken',
  async (tokenId: string, {rejectWithValue, dispatch}) => {
    try {
      const txId = await hederaTokenService.associateToken(tokenId);

      dispatch(fetchBalances());

      return txId;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to associate token');
    }
  },
);

export const restoreWalletSession = createAsyncThunk(
  'wallet/restoreSession',
  async (_, {dispatch, rejectWithValue}) => {
    try {
      const account = await walletService.restoreSession();

      if (account) {
        const walletType = walletService.getWalletType();

        dispatch(fetchBalances());
        dispatch(fetchTransactions(50));

        return {account, walletType};
      }

      return null;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to restore session');
    }
  },
);

const walletSlice = createSlice({
  name: 'wallet',
  initialState,
  reducers: {
    clearError: state => {
      state.error = null;
    },
    addTransaction: (state, action: PayloadAction<Transaction>) => {
      state.transactions.unshift(action.payload);
    },
  },
  extraReducers: builder => {
    builder
      .addCase(connectWallet.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(connectWallet.fulfilled, (state, action) => {
        state.loading = false;
        state.connected = true;
        state.accountId = action.payload.account.accountId;
        state.evmAddress = action.payload.account.evmAddress;
        state.publicKey = action.payload.account.publicKey;
        state.walletType = action.payload.walletType;
      })
      .addCase(connectWallet.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(disconnectWallet.fulfilled, () => {
        return {...initialState};
      })
      .addCase(fetchBalances.pending, state => {
        state.loading = true;
      })
      .addCase(fetchBalances.fulfilled, (state, action) => {
        state.loading = false;
        state.balance = action.payload.hbarBalance;
        state.usdBalance = action.payload.totalUsd;
        state.tokens = action.payload.tokens;
      })
      .addCase(fetchBalances.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchTransactions.pending, state => {
        state.loading = true;
      })
      .addCase(fetchTransactions.fulfilled, (state, action) => {
        state.loading = false;
        state.transactions = action.payload;
      })
      .addCase(fetchTransactions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(sendTokens.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(sendTokens.fulfilled, state => {
        state.loading = false;
      })
      .addCase(sendTokens.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(sendHbar.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(sendHbar.fulfilled, state => {
        state.loading = false;
      })
      .addCase(sendHbar.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(restoreWalletSession.fulfilled, (state, action) => {
        if (action.payload) {
          state.connected = true;
          state.accountId = action.payload.account.accountId;
          state.evmAddress = action.payload.account.evmAddress;
          state.publicKey = action.payload.account.publicKey;
          state.walletType = action.payload.walletType;
        }
      });
  },
});

export const {clearError, addTransaction} = walletSlice.actions;
export default walletSlice.reducer;