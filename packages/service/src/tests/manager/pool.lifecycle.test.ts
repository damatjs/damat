import { describe, it, expect, beforeEach, mock } from "bun:test";
import { PoolManager } from "../../manager/pool";
import type { ConnectionStatus, PoolStats } from "@damatjs/orm-type";

/**
 * Exercises the parts of PoolManager NOT covered by pool.test.ts:
 *   - setup() wiring (pool, entity manager construction, connection manager)
 *   - getPool / getPgEntityManager / setEntityManager
 *   - healthCheck and getStats across BOTH branches
 *     (connectionManager present vs. raw-pool fallback)
 *
 * No live DB is used: the pg Pool and the ConnectionManager are plain fakes.
 * PoolManager.setup constructs a real PgEntityManager, but that constructor
 * only stashes the pool/logger (no I/O), so a fake pool is sufficient.
 */

// --- Fakes ------------------------------------------------------------------

interface FakePool {
  query: ReturnType<typeof mock>;
  totalCount?: number;
  idleCount?: number;
  waitingCount?: number;
}

function makePool(overrides: Partial<FakePool> = {}): FakePool {
  return {
    query: mock(async () => ({ rows: [{ ok: 1 }], rowCount: 1 })),
    totalCount: 5,
    idleCount: 3,
    waitingCount: 1,
    ...overrides,
  };
}

const noopLogger = {
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
} as any;

function makeConnectionManager(opts: {
  status?: ConnectionStatus;
  stats?: PoolStats;
  healthThrows?: boolean;
}) {
  return {
    healthCheck: mock(async () => {
      if (opts.healthThrows) throw new Error("cm boom");
      return (
        opts.status ?? {
          connected: true,
          poolStats: { totalCount: 0, idleCount: 0, waitingCount: 0 },
          lastChecked: new Date(),
        }
      );
    }),
    getPoolStats: mock(
      () => opts.stats ?? { totalCount: 0, idleCount: 0, waitingCount: 0 },
    ),
  } as any;
}

function setup(pool: FakePool, connectionManager: any = null) {
  PoolManager.setup({
    pool: pool as any,
    logger: noopLogger,
    connectionManager,
  });
}

// --- Tests ------------------------------------------------------------------

describe("PoolManager lifecycle", () => {
  beforeEach(() => {
    PoolManager.reset();
  });

  describe("setup", () => {
    it("marks the manager initialized and stores the pool", () => {
      const pool = makePool();
      setup(pool);
      expect(PoolManager.isInitialized()).toBe(true);
      expect(PoolManager.getPool()).toBe(pool as any);
    });

    it("constructs an entity manager during setup", () => {
      setup(makePool());
      expect(PoolManager.hasEntityManager()).toBe(true);
      expect(PoolManager.getPgEntityManager()).toBeDefined();
    });

    it("stores the provided connection manager (and returns it)", () => {
      const cm = makeConnectionManager({});
      setup(makePool(), cm);
      expect(PoolManager.getConnectionManager()).toBe(cm);
    });

    it("leaves connection manager null when explicitly given null", () => {
      setup(makePool(), null);
      expect(PoolManager.getConnectionManager()).toBe(null);
    });
  });

  describe("setEntityManager", () => {
    it("replaces the entity manager instance", () => {
      setup(makePool());
      const fakeEm = { marker: "fake" } as any;
      PoolManager.setEntityManager(fakeEm);
      expect(PoolManager.getPgEntityManager()).toBe(fakeEm);
      expect(PoolManager.hasEntityManager()).toBe(true);
    });
  });

  describe("healthCheck", () => {
    it("delegates to the connection manager and returns its `connected` flag (true)", async () => {
      const cm = makeConnectionManager({
        status: {
          connected: true,
          poolStats: { totalCount: 1, idleCount: 1, waitingCount: 0 },
          lastChecked: new Date(),
        },
      });
      setup(makePool(), cm);
      expect(await PoolManager.healthCheck()).toBe(true);
      expect(cm.healthCheck).toHaveBeenCalledTimes(1);
    });

    it("delegates to the connection manager and returns its `connected` flag (false)", async () => {
      const cm = makeConnectionManager({
        status: {
          connected: false,
          poolStats: { totalCount: 0, idleCount: 0, waitingCount: 0 },
          lastChecked: new Date(),
        },
      });
      setup(makePool(), cm);
      expect(await PoolManager.healthCheck()).toBe(false);
    });

    it("falls back to a raw `SELECT 1` against the pool when there is no connection manager", async () => {
      const pool = makePool({
        query: mock(async () => ({ rows: [{ ok: 1 }], rowCount: 1 })),
      });
      setup(pool, null);
      expect(await PoolManager.healthCheck()).toBe(true);
      expect(pool.query).toHaveBeenCalledWith("SELECT 1 as ok");
    });

    it("returns false when the raw SELECT yields a non-1 value", async () => {
      const pool = makePool({
        query: mock(async () => ({ rows: [{ ok: 0 }], rowCount: 1 })),
      });
      setup(pool, null);
      expect(await PoolManager.healthCheck()).toBe(false);
    });

    it("returns false when the raw SELECT yields no rows", async () => {
      const pool = makePool({
        query: mock(async () => ({ rows: [], rowCount: 0 })),
      });
      setup(pool, null);
      expect(await PoolManager.healthCheck()).toBe(false);
    });

    it("returns false when the pool query throws", async () => {
      const pool = makePool({
        query: mock(async () => {
          throw new Error("connection refused");
        }),
      });
      setup(pool, null);
      expect(await PoolManager.healthCheck()).toBe(false);
    });
  });

  describe("getStats", () => {
    it("maps connection-manager pool stats onto PoolManagerStats", () => {
      const cm = makeConnectionManager({
        stats: { totalCount: 10, idleCount: 4, waitingCount: 2 },
      });
      setup(makePool(), cm);
      expect(PoolManager.getStats()).toEqual({
        totalConnections: 10,
        idleConnections: 4,
        waitingCount: 2,
      });
    });

    it("reads counters directly from the pool when no connection manager", () => {
      setup(
        makePool({ totalCount: 8, idleCount: 6, waitingCount: 0 }),
        null,
      );
      expect(PoolManager.getStats()).toEqual({
        totalConnections: 8,
        idleConnections: 6,
        waitingCount: 0,
      });
    });

    it("defaults missing pool counters to 0 via nullish coalescing", () => {
      setup(
        makePool({
          totalCount: undefined,
          idleCount: undefined,
          waitingCount: undefined,
        }),
        null,
      );
      expect(PoolManager.getStats()).toEqual({
        totalConnections: 0,
        idleConnections: 0,
        waitingCount: 0,
      });
    });
  });

  describe("private constructor", () => {
    it("can be instantiated (private at type level only, not at runtime)", () => {
      // PoolManager is a static-only singleton with a private no-op constructor.
      // The constructor is unreachable through normal use; exercise it directly
      // (TS `private` is not enforced at runtime) so coverage reflects reality.
      const Ctor = PoolManager as unknown as { new (): PoolManager };
      const instance = new Ctor();
      expect(instance).toBeInstanceOf(PoolManager);
    });
  });

  describe("reset after setup", () => {
    it("clears pool, entity manager, and connection manager", () => {
      setup(makePool(), makeConnectionManager({}));
      expect(PoolManager.isInitialized()).toBe(true);

      PoolManager.reset();

      expect(PoolManager.isInitialized()).toBe(false);
      expect(PoolManager.hasEntityManager()).toBe(false);
      expect(PoolManager.getConnectionManager()).toBe(null);
      expect(() => PoolManager.getPool()).toThrow(
        "Pool not initialized. Call PoolManager.setup(pool) first.",
      );
      expect(() => PoolManager.getPgEntityManager()).toThrow(
        "EntityManager not initialized. Call PoolManager.setup(pool) first.",
      );
    });
  });
});
