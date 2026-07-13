import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test";

// The framework's database service is a thin singleton that wires the
// `@damatjs/orm-connector` ConnectionManager to the `@damatjs/services`
// PoolManager and applies environment-based pool defaults. We mock BOTH
// collaborators so the whole lifecycle (init -> health -> close -> re-init)
// runs with NO live database — this exercises framework wiring, not pg.

// --- Mock collaborators (installed before importing the module under test) ---

type AnyConfig = Record<string, unknown>;

// Capture every ConnectionManager constructed and the config it received.
let constructedConfigs: AnyConfig[] = [];
let connectCalls = 0;
let disconnectCalls = 0;
let healthCalls = 0;
let connectShouldThrow: Error | null = null;

class FakeConnectionManager {
  config: AnyConfig;
  constructor(config: AnyConfig) {
    this.config = config;
    constructedConfigs.push(config);
  }
  async connect() {
    connectCalls++;
    if (connectShouldThrow) throw connectShouldThrow;
    return { __fakePool: true } as never;
  }
  async disconnect() {
    disconnectCalls++;
  }
  async healthCheck() {
    healthCalls++;
    return { connected: true, poolStats: { totalCount: 1, idleCount: 1, waitingCount: 0 }, lastChecked: new Date() };
  }
}

// Identifiable sentinels so we can assert which env defaults were merged in.
const DEV = { __preset: "dev", max: 10 };
const PROD = { __preset: "prod", max: 50 };
const TEST = { __preset: "test", max: 5 };

mock.module("@damatjs/orm-connector", () => ({
  ConnectionManager: FakeConnectionManager,
  developmentPoolConfig: () => ({ ...DEV }),
  productionPoolConfig: () => ({ ...PROD }),
  testPoolConfig: () => ({ ...TEST }),
}));

let setupCalls: Array<{ pool: unknown; connectionManager: unknown }> = [];
let resetCalls = 0;

mock.module("@damatjs/services", () => ({
  PoolManager: {
    setup: (args: { pool: unknown; connectionManager: unknown }) => {
      setupCalls.push(args);
    },
    reset: () => {
      resetCalls++;
    },
    // Present so this process-global stub still satisfies the auth wiring's
    // pool probe (`PoolManager.isInitialized()`) if this mock leaks into a
    // sibling test file (mock.module is process-wide).
    isInitialized: () => false,
    getPool: () => undefined,
  },
}));

const { initDatabase, getConnectionManager, checkHealth, closeDatabase } = await import(
  "../../services/database"
);

const createLogger = () => ({
  info: mock(() => {}),
  error: mock(() => {}),
  warn: mock(() => {}),
  debug: mock(() => {}),
});

const baseDbConfig = { host: "localhost", port: 5432, user: "u", password: "p", database: "d" };

beforeEach(() => {
  constructedConfigs = [];
  connectCalls = 0;
  disconnectCalls = 0;
  healthCalls = 0;
  connectShouldThrow = null;
  setupCalls = [];
  resetCalls = 0;
});

afterEach(async () => {
  // Reset the module-level singleton so each test starts clean.
  await closeDatabase();
});

describe("initDatabase", () => {
  it("connects, wires the PoolManager, logs, and returns the pool", async () => {
    const logger = createLogger();
    const pool = await initDatabase(baseDbConfig as never, logger as never, "development");

    expect(connectCalls).toBe(1);
    expect(pool).toEqual({ __fakePool: true } as never);
    expect(setupCalls).toHaveLength(1);
    expect(setupCalls[0]!.pool).toEqual({ __fakePool: true });
    expect(setupCalls[0]!.connectionManager).toBeInstanceOf(FakeConnectionManager);
    expect(logger.info).toHaveBeenCalled();
  });

  it("merges development pool defaults when no advanced settings are provided", async () => {
    const logger = createLogger();
    await initDatabase(baseDbConfig as never, logger as never, "development");
    const cfg = constructedConfigs[0]!;
    expect(cfg.__preset).toBe("dev");
    expect(cfg.host).toBe("localhost");
  });

  it("merges production pool defaults for the production env", async () => {
    const logger = createLogger();
    await initDatabase(baseDbConfig as never, logger as never, "production");
    expect(constructedConfigs[0]!.__preset).toBe("prod");
  });

  it("merges test pool defaults for the test env", async () => {
    const logger = createLogger();
    await initDatabase(baseDbConfig as never, logger as never, "test");
    expect(constructedConfigs[0]!.__preset).toBe("test");
  });

  it("falls back to development defaults for an unrecognized env", async () => {
    const logger = createLogger();
    await initDatabase(baseDbConfig as never, logger as never, "staging" as never);
    expect(constructedConfigs[0]!.__preset).toBe("dev");
  });

  it("does NOT merge env defaults when advanced pool settings are supplied", async () => {
    const logger = createLogger();
    const advanced = { ...baseDbConfig, max: 99, connectionTimeoutMillis: 1000 };
    await initDatabase(advanced as never, logger as never, "production");
    const cfg = constructedConfigs[0]!;
    // The caller's explicit config is used verbatim — no preset merged in.
    expect(cfg.__preset).toBeUndefined();
    expect(cfg.max).toBe(99);
  });

  it("reuses the existing ConnectionManager singleton on a second call", async () => {
    const logger = createLogger();
    await initDatabase(baseDbConfig as never, logger as never, "development");
    await initDatabase(baseDbConfig as never, logger as never, "development");
    // Only one ConnectionManager is ever constructed; connect() is called each time.
    expect(constructedConfigs).toHaveLength(1);
    expect(connectCalls).toBe(2);
  });

  it("propagates a connection failure to the caller", async () => {
    const logger = createLogger();
    connectShouldThrow = new Error("ECONNREFUSED");
    await expect(initDatabase(baseDbConfig as never, logger as never, "development")).rejects.toThrow(
      "ECONNREFUSED",
    );
  });
});

describe("getConnectionManager", () => {
  it("returns null before init and the manager after init", async () => {
    expect(getConnectionManager()).toBeNull();
    await initDatabase(baseDbConfig as never, createLogger() as never, "development");
    expect(getConnectionManager()).toBeInstanceOf(FakeConnectionManager);
  });
});

describe("checkHealth", () => {
  it("returns null when no connection manager exists", async () => {
    expect(await checkHealth()).toBeNull();
  });

  it("delegates to the connection manager once initialized", async () => {
    await initDatabase(baseDbConfig as never, createLogger() as never, "development");
    const status = await checkHealth();
    expect(healthCalls).toBe(1);
    expect(status?.connected).toBe(true);
  });
});

describe("closeDatabase", () => {
  it("disconnects, clears the singleton, and resets the PoolManager", async () => {
    await initDatabase(baseDbConfig as never, createLogger() as never, "development");
    await closeDatabase();
    expect(disconnectCalls).toBe(1);
    expect(resetCalls).toBeGreaterThanOrEqual(1);
    expect(getConnectionManager()).toBeNull();
  });

  it("still resets the PoolManager even when never connected", async () => {
    await closeDatabase();
    expect(disconnectCalls).toBe(0);
    expect(resetCalls).toBe(1);
  });
});
