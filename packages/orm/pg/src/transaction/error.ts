export class TransactionError extends Error {
  constructor(
    message: string,
    public readonly cause?: Error,
  ) {
    super(message);
    this.name = "TransactionError";
  }
}

export class TransactionContextError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TransactionContextError";
  }
}
