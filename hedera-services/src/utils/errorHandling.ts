export class HederaOperationError extends Error {
  constructor(
    message: string,
    public operation: string,
    public hederaStatus?: number,
    public transactionId?: string
  ) {
    super(message);
    this.name = 'HederaOperationError';
  }
}

