/**
 * Connection Pool Configuration
 */

export interface PoolConfig {
  // Connection
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
  connectionString?: string;

  // Pool size
  min?: number; // Minimum connections
  max?: number; // Maximum connections (default: 10)
  
  // Timeouts (ms)
  connectionTimeoutMillis?: number; // Acquire connection timeout (default: 0 = no timeout)
  idleTimeoutMillis?: number; // Close idle connections (default: 10000)
  
  // SSL
  ssl?: boolean | object;
  
  // Logging
  allowExitOnIdle?: boolean;
}

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
 * Create a configured connection pool
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
export function productionPoolConfig(overrides?: Partial<PoolConfig>): PoolConfig {
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
export function developmentPoolConfig(overrides?: Partial<PoolConfig>): PoolConfig {
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
export function testPoolConfig(overrides?: Partial<PoolConfig>): PoolConfig {
  return {
    min: 0,
    max: 2,
    connectionTimeoutMillis: 2000,
    idleTimeoutMillis: 1000,
    ...overrides,
  };
}
