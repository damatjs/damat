export class RedisConnectionError extends Error {
  constructor(
    message: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = "RedisConnectionError";
  }
}

export class RedisNotInitializedError extends Error {
  constructor(message = "Redis not initialized. Call initRedis() first.") {
    super(message);
    this.name = "RedisNotInitializedError";
  }
}
