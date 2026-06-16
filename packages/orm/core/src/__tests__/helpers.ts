import type { ILogger, LogContext, RequestLogData } from "@damatjs/logger";
import type { ModelDefinition } from "@damatjs/orm-model";

/**
 * A recording fake ILogger. Every call is pushed onto `calls` so tests can
 * assert on the exact method, message, and arguments without touching the real
 * console-backed Logger.
 */
export interface LoggerCall {
  method: keyof ILogger;
  args: unknown[];
}

export class FakeLogger implements ILogger {
  calls: LoggerCall[] = [];

  private record(method: keyof ILogger, args: unknown[]): void {
    this.calls.push({ method, args });
  }

  callsTo(method: keyof ILogger): LoggerCall[] {
    return this.calls.filter((c) => c.method === method);
  }

  reset(): void {
    this.calls = [];
  }

  debug(message: string, context?: LogContext): void {
    this.record("debug", [message, context]);
  }
  info(message: string, context?: LogContext): void {
    this.record("info", [message, context]);
  }
  waiting(message: string, context?: LogContext): void {
    this.record("waiting", [message, context]);
  }
  progress(message: string, context?: LogContext): void {
    this.record("progress", [message, context]);
  }
  cached(message: string, context?: LogContext): void {
    this.record("cached", [message, context]);
  }
  success(message: string, context?: LogContext): void {
    this.record("success", [message, context]);
  }
  warn(message: string, context?: LogContext): void {
    this.record("warn", [message, context]);
  }
  error(message: string, error?: unknown, context?: LogContext): void {
    this.record("error", [message, error, context]);
  }
  fatal(message: string, error?: unknown, context?: LogContext): void {
    this.record("fatal", [message, error, context]);
  }
  skip(message: string, context?: LogContext): void {
    this.record("skip", [message, context]);
  }
  child(_context: LogContext): ILogger {
    return this;
  }
  withPrefix(_prefix: string): ILogger {
    return this;
  }
  request(_data: RequestLogData): void {
    this.record("request", [_data]);
  }
}

/**
 * Shape of the bits of a relation that `ModelRegistry.resolveRelation` reads.
 * Mirrors @damatjs/orm-type's RelationSchema closely enough for these tests.
 */
export interface FakeRelation {
  fromTable: string;
  from: string;
  to: string;
  type: string;
  [key: string]: unknown;
}

export interface FakeModelOptions {
  tableName: string;
  schemaName?: string;
  columns?: string[];
  relations?: FakeRelation[];
}

/**
 * Build a minimal object that satisfies the ModelDefinition surface that
 * ModelRegistry actually depends on: `_tableName`, `_schemaName`, and
 * `toTableSchema()` returning `{ columns, relations }`.
 *
 * We do NOT use the real ModelDefinition builder because it registers itself in
 * a global model registry on construction; the fake keeps tests isolated and
 * deterministic while exercising the exact code paths in registry.ts.
 */
export function makeModel(opts: FakeModelOptions): ModelDefinition {
  const { tableName, schemaName, columns = [], relations = [] } = opts;

  const fake = {
    _tableName: tableName,
    _schemaName: schemaName,
    toTableSchema() {
      return {
        name: tableName,
        columns: columns.map((name) => ({ name })),
        indexes: [],
        foreignKeys: [],
        constraints: [],
        relations,
        ...(schemaName !== undefined ? { schema: schemaName } : {}),
      };
    },
  };

  return fake as unknown as ModelDefinition;
}
