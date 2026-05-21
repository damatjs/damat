import type { Pool, PoolClient, QueryResultRow } from "@damatjs/deps/pg";
import type { ModelDefinition } from "@damatjs/orm-model";
import type { DbPoolConfig } from "@damatjs/orm-type";

export type { Pool, PoolClient, QueryResultRow };

export type DbPoolConfigWithExtras = DbPoolConfig & {
  allowExitOnIdle?: boolean;
};

export interface PgEntityManagerConfig<TModels extends Record<string, ModelDefinition> = Record<string, ModelDefinition>> {
  pool: Pool;
  models: TModels;
  logger?: LoggerInterface;
}

export interface LoggerInterface {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

export interface ConnectionStatus {
  connected: boolean;
  poolStats: PoolStats;
  lastChecked: Date;
}

export interface PoolStats {
  totalCount: number;
  idleCount: number;
  waitingCount: number;
}

export interface ModelRegistryEntry<T extends QueryResultRow = QueryResultRow> {
  model: ModelDefinition;
  tableName: string;
  schema: string | undefined;
  columns: string[];
}

export type TransactionIsolationLevel = 
  | "READ UNCOMMITTED"
  | "READ COMMITTED"
  | "REPEATABLE READ"
  | "SERIALIZABLE";

export interface TransactionOptions {
  isolationLevel?: TransactionIsolationLevel;
  readOnly?: boolean;
  deferrable?: boolean;
}

export type EntityConstructor<T> = new () => T;

export interface QueryContext {
  schema?: string;
  timezone?: string;
  debug?: boolean;
}
