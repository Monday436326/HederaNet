// src/utils/validators.ts
export const validateAddress = (address: string): boolean => {
  const addressRegex = /^0x[a-fA-F0-9]{40}$/;
  return addressRegex.test(address);
};

export const validateAmount = (amount: string, balance: number): {
  valid: boolean;
  error?: string;
} => {
  const numAmount = parseFloat(amount);
  
  if (isNaN(numAmount)) {
    return {valid: false, error: 'Invalid amount'};
  }
  
  if (numAmount <= 0) {
    return {valid: false, error: 'Amount must be greater than 0'};
  }
  
  if (numAmount > balance) {
    return {valid: false, error: 'Insufficient balance'};
  }
  
  return {valid: true};
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};
