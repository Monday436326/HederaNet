// src/store/slices/energySlice.ts - FINAL PRODUCTION VERSION
import {createSlice, createAsyncThunk} from '@reduxjs/toolkit';
import {EnergyState} from '../types';
import {smartContractService} from '../../services/hedera/SmartContractService';
import {hcsService} from '../../services/hedera/HCSService';
import {walletService} from '../../services/hedera/WalletService';

const initialState: EnergyState = {
  generated: 0,
  earned: 0,
  listings: [],
  userListings: [],
  loading: false,
  error: null,
};

export const fetchEnergyListings = createAsyncThunk(
  'energy/fetchListings',
  async (_, {rejectWithValue}) => {
    try {
      const listings = await smartContractService.getActiveEnergyListings();
      return listings;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch energy listings');
    }
  },
);

export const createEnergyListing = createAsyncThunk(
  'energy/createListing',
  async (
    {
      energyAmount,
      pricePerKwh,
      durationHours,
      qualityProof,
    }: {
      energyAmount: number;
      pricePerKwh: number;
      durationHours: number;
      qualityProof: string;
    },
    {rejectWithValue, dispatch},
  ) => {
    try {
      const account = walletService.getCurrentAccount();
      if (!account) throw new Error('No wallet connected');

      const listingId = await smartContractService.createEnergyListing(
        energyAmount,
        pricePerKwh,
        durationHours * 3600,
        qualityProof,
      );

      await hcsService.submitEnergyTrade({
        type: 'listing_created',
        listingId,
        seller: account.accountId,
        energyAmount,
        pricePerKwh,
        timestamp: Date.now(),
      });

      dispatch(fetchEnergyListings());

      return listingId;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to create energy listing');
    }
  },
);

export const purchaseEnergy = createAsyncThunk(
  'energy/purchase',
  async ({listingId}: {listingId: string}, {rejectWithValue, dispatch}) => {
    try {
      const account = walletService.getCurrentAccount();
      if (!account) throw new Error('No wallet connected');

      const listing = await smartContractService.getEnergyListing(listingId);

      const txId = await smartContractService.purchaseEnergy(listingId);

      await hcsService.submitEnergyTrade({
        type: 'trade_executed',
        listingId,
        seller: listing.seller,
        buyer: account.accountId,
        energyAmount: listing.energyAmount,
        pricePerKwh: listing.pricePerKwh,
        totalCost: listing.energyAmount * listing.pricePerKwh,
        deliveryStatus: 'completed',
        timestamp: Date.now(),
      });

      dispatch(fetchEnergyListings());
      dispatch(fetchUserEnergyStats());

      return txId;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to purchase energy');
    }
  },
);

export const fetchUserEnergyStats = createAsyncThunk(
  'energy/fetchUserStats',
  async (_, {rejectWithValue}) => {
    try {
      const account = walletService.getCurrentAccount();
      if (!account) throw new Error('No wallet connected');

      const trades = await hcsService.getRecentEnergyTrades(100);

      let generated = 0;
      let earned = 0;

      trades.forEach(trade => {
        if (
          trade.seller === account.accountId &&
          trade.type === 'trade_executed'
        ) {
          generated += trade.energyAmount;
          earned += trade.totalCost || 0;
        }
      });

      return {generated, earned};
    } catch (error: any) {
      return rejectWithValue(
        error.message || 'Failed to fetch energy stats',
      );
    }
  },
);

export const fetchUserListings = createAsyncThunk(
  'energy/fetchUserListings',
  async (_, {rejectWithValue}) => {
    try {
      const account = walletService.getCurrentAccount();
      if (!account) throw new Error('No wallet connected');

      const allListings = await smartContractService.getActiveEnergyListings();

      const userListings = allListings.filter(
        listing =>
          listing.seller.toLowerCase() === account.evmAddress.toLowerCase(),
      );

      return userListings;
    } catch (error: any) {
      return rejectWithValue(
        error.message || 'Failed to fetch user listings',
      );
    }
  },
);

export const subscribeToEnergyEvents = createAsyncThunk(
  'energy/subscribe',
  async (_, {dispatch}) => {
    try {
      await hcsService.subscribeToEnergyTrading(message => {
        if (
          message.type === 'listing_created' ||
          message.type === 'trade_executed'
        ) {
          dispatch(fetchEnergyListings());
          dispatch(fetchUserEnergyStats());
        }
      });
    } catch (error) {
      console.error('Error subscribing to energy events:', error);
    }
  },
);

const energySlice = createSlice({
  name: 'energy',
  initialState,
  reducers: {
    clearError: state => {
      state.error = null;
    },
  },
  extraReducers: builder => {
    builder
      .addCase(fetchEnergyListings.pending, state => {
        state.loading = true;
      })
      .addCase(fetchEnergyListings.fulfilled, (state, action) => {
        state.loading = false;
        state.listings = action.payload;
      })
      .addCase(fetchEnergyListings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(createEnergyListing.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createEnergyListing.fulfilled, state => {
        state.loading = false;
      })
      .addCase(createEnergyListing.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(purchaseEnergy.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(purchaseEnergy.fulfilled, state => {
        state.loading = false;
      })
      .addCase(purchaseEnergy.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchUserEnergyStats.fulfilled, (state, action) => {
        state.generated = action.payload.generated;
        state.earned = action.payload.earned;
      })
      .addCase(fetchUserListings.fulfilled, (state, action) => {
        state.userListings = action.payload;
      });
  },
});

export const {clearError} = energySlice.actions;
export default energySlice.reducer;