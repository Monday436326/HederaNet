// src/services/api.ts
import axios from 'axios';

const API_BASE_URL = 'https://api.hederanet.io';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  config => {
    // Add auth token if available
    const token = ''; // Get from AsyncStorage
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => Promise.reject(error),
);

api.interceptors.response.use(
  response => response.data,
  error => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  },
);

export const apiService = {
  // Wallet APIs
  getBalance: async (address: string) => {
    return api.get(`/wallet/balance/${address}`);
  },
  
  sendTransaction: async (data: {
    to: string;
    amount: number;
    token: string;
  }) => {
    return api.post('/wallet/send', data);
  },
  
  getTransactions: async (address: string) => {
    return api.get(`/wallet/transactions/${address}`);
  },
  
  // Energy APIs
  getEnergyListings: async () => {
    return api.get('/energy/listings');
  },
  
  purchaseEnergy: async (data: {
    listingId: string;
    amount: number;
  }) => {
    return api.post('/energy/purchase', data);
  },
  
  listEnergy: async (data: {
    amount: number;
    price: number;
    duration: number;
  }) => {
    return api.post('/energy/list', data);
  },
  
  // Governance APIs
  getProposals: async () => {
    return api.get('/governance/proposals');
  },
  
  voteOnProposal: async (data: {
    proposalId: string;
    vote: 'yes' | 'no';
  }) => {
    return api.post('/governance/vote', data);
  },
  
  createProposal: async (data: {
    title: string;
    description: string;
  }) => {
    return api.post('/governance/proposal', data);
  },
};
