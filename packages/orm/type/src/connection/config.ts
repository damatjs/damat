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

export interface DbPoolStats {
  totalCount: number;
  idleCount: number;
  waitingCount: number;
}
