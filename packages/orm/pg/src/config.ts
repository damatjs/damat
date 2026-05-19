/**
 * PostgreSQL Connection Pool Configuration
 */

import type { DbPoolConfig } from "@damatjs/orm-type";

export type PoolConfig = DbPoolConfig & {
  allowExitOnIdle?: boolean;
};

export interface PoolStats {
  totalCount: number;
  idleCount: number;
  waitingCount: number;
}

export interface ConnectionPool {
  query(sql: string, params?: unknown[]): Promise<{ rows: unknown[]; rowCount: number }>;
  connect(): Promise<PoolClient>;
  end(): Promise<void>;
  totalCount?: number;
  idleCount?: number;
  waitingCount?: number;
}

export interface PoolClient {
  query(sql: string, params?: unknown[]): Promise<{ rows: unknown[]; rowCount: number }>;
  release(): void;
}

/**
 * Create a configured connection pool config
 */
export function createPoolConfig(config: PoolConfig | string): PoolConfig {
  if (typeof config === 'string') {
    return { connectionString: config };
  }
  return config;
}

/**
 * Pool configuration for production
 */
export function productionPoolConfig(overrides: Partial<PoolConfig> = {}): PoolConfig {
  return {
    min: 2,
    max: 20,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    allowExitOnIdle: false,
    ...overrides,
  };
}

/**
 * Pool configuration for development
 */
export function developmentPoolConfig(overrides: Partial<PoolConfig> = {}): PoolConfig {
  return {
    min: 1,
    max: 5,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 10000,
    ...overrides,
  };
}

/**
 * Pool configuration for testing
 */
export function testPoolConfig(overrides: Partial<PoolConfig> = {}): PoolConfig {
  return {
    min: 0,
    max: 2,
    connectionTimeoutMillis: 2000,
    idleTimeoutMillis: 1000,
    ...overrides,
  };
}

/**
 * Parse database URL into pool config
 */
export function parseDatabaseUrl(url: string): PoolConfig {
  try {
    const parsed = new URL(url);
    const config: PoolConfig = {
      host: parsed.hostname,
      port: parsed.port ? parseInt(parsed.port, 10) : 5432,
      user: parsed.username,
      password: parsed.password,
      database: parsed.pathname.slice(1),
    };
    
    const sslMode = parsed.searchParams.get('sslmode');
    if (sslMode === 'require') {
      config.ssl = { rejectUnauthorized: false };
    }
    
    return config;
  } catch {
    return { connectionString: url };
  }
}
