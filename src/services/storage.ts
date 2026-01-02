// src/services/storage.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

export const storageService = {
  setItem: async (key: string, value: any): Promise<void> => {
    try {
      const jsonValue = JSON.stringify(value);
      await AsyncStorage.setItem(key, jsonValue);
    } catch (error) {
      console.error('Storage setItem error:', error);
    }
  },

  getItem: async <T>(key: string): Promise<T | null> => {
    try {
      const jsonValue = await AsyncStorage.getItem(key);
      return jsonValue != null ? JSON.parse(jsonValue) : null;
    } catch (error) {
      console.error('Storage getItem error:', error);
      return null;
    }
  },

  removeItem: async (key: string): Promise<void> => {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('Storage removeItem error:', error);
    }
  },

  clear: async (): Promise<void> => {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.error('Storage clear error:', error);
    }
  },
};

// Storage keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: '@hederanet/auth_token',
  USER_ADDRESS: '@hederanet/user_address',
  WALLET_DATA: '@hederanet/wallet_data',
  SETTINGS: '@hederanet/settings',
};
