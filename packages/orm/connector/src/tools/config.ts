import type { DbPoolConfigWithExtras } from "@damatjs/orm-type";

export function productionPoolConfig(overrides: Partial<DbPoolConfigWithExtras> = {}): DbPoolConfigWithExtras {
  return {
    min: 2,
    max: 20,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    allowExitOnIdle: false,
    ...overrides,
  };
}

export function developmentPoolConfig(overrides: Partial<DbPoolConfigWithExtras> = {}): DbPoolConfigWithExtras {
  return {
    min: 1,
    max: 5,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 10000,
    ...overrides,
  };
}

export function testPoolConfig(overrides: Partial<DbPoolConfigWithExtras> = {}): DbPoolConfigWithExtras {
  return {
    min: 0,
    max: 2,
    connectionTimeoutMillis: 2000,
    idleTimeoutMillis: 1000,
    ...overrides,
  };
}
