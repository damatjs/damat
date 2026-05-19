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

export function createPoolConfig(config: PoolConfig | string): PoolConfig {
  return typeof config === 'string' ? { connectionString: config } : config;
}

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

export function developmentPoolConfig(overrides: Partial<PoolConfig> = {}): PoolConfig {
  return {
    min: 1,
    max: 5,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 10000,
    ...overrides,
  };
}

export function testPoolConfig(overrides: Partial<PoolConfig> = {}): PoolConfig {
  return {
    min: 0,
    max: 2,
    connectionTimeoutMillis: 2000,
    idleTimeoutMillis: 1000,
    ...overrides,
  };
}

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
    
    if (parsed.searchParams.get('sslmode') === 'require') {
      config.ssl = { rejectUnauthorized: false };
    }
    return config;
  } catch {
    return { connectionString: url };
  }
}
