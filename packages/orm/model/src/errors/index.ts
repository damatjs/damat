/**
 * Custom Error Types for ORM
 */

// Base ORM Error
export class OrmError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "OrmError";
  }
}

// Database Connection Errors
export class ConnectionError extends OrmError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, "CONNECTION_ERROR", details);
    this.name = "ConnectionError";
  }
}

// Query Errors
export class QueryError extends OrmError {
  constructor(
    message: string,
    public readonly sql: string,
    public readonly params?: unknown[],
    details?: Record<string, unknown>,
  ) {
    super(message, "QUERY_ERROR", { sql, params, ...details });
    this.name = "QueryError";
  }
}

// Model Errors
export class ModelError extends OrmError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, "MODEL_ERROR", details);
    this.name = "ModelError";
  }
}

// Validation Errors
export class ValidationError extends OrmError {
  constructor(
    message: string,
    public readonly field: string,
    public readonly value: unknown,
  ) {
    super(message, "VALIDATION_ERROR", { field, value });
    this.name = "ValidationError";
  }
}

// Not Found Error
export class NotFoundError extends OrmError {
  constructor(
    public readonly model: string,
    public readonly criteria: Record<string, unknown>,
  ) {
    super(
      `${model} not found with criteria: ${JSON.stringify(criteria)}`,
      "NOT_FOUND",
      { model, criteria },
    );
    this.name = "NotFoundError";
  }
}

// Duplicate Error
export class DuplicateError extends OrmError {
  constructor(
    public readonly model: string,
    public readonly field: string,
    public readonly value: unknown,
  ) {
    super(
      `${model} with ${field}="${value}" already exists`,
      "DUPLICATE_ERROR",
      { model, field, value },
    );
    this.name = "DuplicateError";
  }
}

// Transaction Error
export class TransactionError extends OrmError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, "TRANSACTION_ERROR", details);
    this.name = "TransactionError";
  }
}

// Migration Error
export class MigrationError extends OrmError {
  constructor(
    message: string,
    public readonly migration?: string,
    details?: Record<string, unknown>,
  ) {
    super(message, "MIGRATION_ERROR", { migration, ...details });
    this.name = "MigrationError";
  }
}
