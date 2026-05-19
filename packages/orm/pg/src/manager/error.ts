export class EntityManagerError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = "EntityManagerError";
  }
}

export class QueryExecutionError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = "QueryExecutionError";
  }
}
