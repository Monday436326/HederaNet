import {configureStore} from '@reduxjs/toolkit';
import walletReducer from './slices/walletSlice';
import energyReducer from './slices/energySlice';
import governanceReducer from './slices/governanceSlice';

export const store = configureStore({
  reducer: {
    wallet: walletReducer,
    energy: energyReducer,
    governance: governanceReducer,
  },
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;