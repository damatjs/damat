import { describe, it, expect, beforeEach } from "bun:test";
import { PoolManager } from "../../manager/pool";
import type { Pool } from "@damatjs/orm-type";
import type { ILogger } from "@damatjs/logger";
import type { ConnectionManager } from "@damatjs/orm-connector";

function makeFakePool(): Pool & { endCalls: number } {
  const pool = {
    endCalls: 0,
    ended: false,
    async end() {
      if (pool.ended) throw new Error("Called end on pool more than once");
      pool.ended = true;
      pool.endCalls++;
    },
    async query() {
      return { rows: [], rowCount: 0 };
    },
  };
  return pool as unknown as Pool & { endCalls: number };
}

const fakeLogger = {
  debug: () => {},
  info: () => {},
  error: () => {},
} as unknown as ILogger;
const fakeConnectionManager = {
  healthCheck: async () => ({ connected: true }),
  getPoolStats: () => ({ totalCount: 0, idleCount: 0, waitingCount: 0 }),
} as unknown as ConnectionManager;

describe("PoolManager.close", () => {
  beforeEach(() => {
    PoolManager.reset();
  });

  it("ends the pool and clears all state", async () => {
    const pool = makeFakePool();
    PoolManager.setup({
      pool,
      logger: fakeLogger,
      connectionManager: fakeConnectionManager,
    });
    expect(PoolManager.isInitialized()).toBe(true);

    await PoolManager.close();

    expect(pool.endCalls).toBe(1);
    expect(PoolManager.isInitialized()).toBe(false);
    expect(PoolManager.hasEntityManager()).toBe(false);
    expect(PoolManager.getConnectionManager()).toBe(null);
  });

  it("is idempotent — a second close is a no-op", async () => {
    const pool = makeFakePool();
    PoolManager.setup({
      pool,
      logger: fakeLogger,
      connectionManager: fakeConnectionManager,
    });

    await PoolManager.close();
    await PoolManager.close(); // must not throw or call end again

    expect(pool.endCalls).toBe(1);
  });

  it("does not double-end a pool someone else already ended", async () => {
    const pool = makeFakePool();
    PoolManager.setup({
      pool,
      logger: fakeLogger,
      connectionManager: fakeConnectionManager,
    });
    await pool.end();

    await PoolManager.close(); // pg throws on double end(); close must guard

    expect(pool.endCalls).toBe(1);
    expect(PoolManager.isInitialized()).toBe(false);
  });

  it("is a no-op when nothing was ever set up", async () => {
    await PoolManager.close();
    expect(PoolManager.isInitialized()).toBe(false);
  });
});
