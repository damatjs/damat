export interface DbPoolConfig {
  connectionString?: string;
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
  ssl?: boolean | object;
  min?: number;
  max?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
}

export interface DbConnectionConfig {
  database: string | DbPoolConfig;
}

export type DbPoolConfigWithExtras = DbPoolConfig & {
  allowExitOnIdle?: boolean;
};

export interface ConnectionStatus {
  connected: boolean;
  poolStats: PoolStats;
  lastChecked: Date;
}

export interface PoolStats {
  totalCount: number;
  idleCount: number;
  activeCount: number;
  waitingCount: number;
}

export type TransactionIsolationLevel =
  "READ UNCOMMITTED" | "READ COMMITTED" | "REPEATABLE READ" | "SERIALIZABLE";

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
