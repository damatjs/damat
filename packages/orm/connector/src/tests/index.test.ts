import { describe, it, expect, beforeEach, mock } from "bun:test";
import {
  FakePool,
  FakePoolClient,
  StubLogger,
  type FakePoolOptions,
} from "./helpers/fakePool";
import type { DbPoolConfigWithExtras } from "@damatjs/orm-type";

/**
 * Controls how the mocked `@damatjs/deps/pg` `Pool` constructor behaves.
 * Each test can install its own factory (and inspect the created instances)
 * so the whole ConnectionManager lifecycle runs with NO live database.
 */
let poolFactory: (config: DbPoolConfigWithExtras) => FakePool = () =>
  new FakePool();
let createdPools: FakePool[] = [];
let lastConfig: DbPoolConfigWithExtras | undefined;

function useFakePool(opts: FakePoolOptions = {}) {
  poolFactory = () => new FakePool(opts);
}

class MockPool {
  constructor(config: DbPoolConfigWithExtras) {
    lastConfig = config;
    const instance = poolFactory(config);
    createdPools.push(instance);
    return instance as unknown as MockPool;
  }
}

// Replace the real pg Pool BEFORE ConnectionManager is imported.
mock.module("@damatjs/deps/pg", () => ({ Pool: MockPool }));

const { ConnectionManager } = await import("../index");
const { ConnectionError } = await import("../tools");

const config: DbPoolConfigWithExtras = {
  host: "localhost",
  port: 5432,
  user: "u",
  password: "p",
  database: "d",
};

describe("ConnectionManager", () => {
  let logger: StubLogger;

  beforeEach(() => {
    logger = new StubLogger();
    poolFactory = () => new FakePool();
    createdPools = [];
    lastConfig = undefined;
  });

  describe("constructor", () => {
    it("should create an instance and start uninitialized", () => {
      const cm = new ConnectionManager(config);
      expect(cm).toBeInstanceOf(ConnectionManager);
      expect(cm.isInitialized()).toBe(false);
    });

    it("should accept an optional logger", () => {
      const cm = new ConnectionManager(config, logger);
      expect(cm).toBeInstanceOf(ConnectionManager);
    });

    it("should not create a pool until connect() is called", () => {
      new ConnectionManager(config, logger);
      expect(createdPools).toHaveLength(0);
    });
  });

  describe("connect", () => {
    it("should create a pool with the provided config and connect", async () => {
      const cm = new ConnectionManager(config, logger);
      const pool = await cm.connect();
      expect(pool).toBeDefined();
      expect(cm.isInitialized()).toBe(true);
      expect(lastConfig).toEqual(config);
      expect(createdPools).toHaveLength(1);
      expect(createdPools[0]!.connectCalls).toBe(1);
    });

    it("should register pool listeners when a logger is provided", async () => {
      const cm = new ConnectionManager(config, logger);
      await cm.connect();
      const pool = createdPools[0]!;
      expect(pool.listenerCount("error")).toBe(1);
      expect(pool.listenerCount("connect")).toBe(1);
      // Drive a listener to prove the logger is wired up.
      pool.emit("connect");
      expect(logger.messages("debug")).toContain(
        "New client connected to pool",
      );
    });

    it("should NOT register listeners when no logger is provided", async () => {
      const cm = new ConnectionManager(config);
      await cm.connect();
      const pool = createdPools[0]!;
      expect(pool.listenerCount("connect")).toBe(0);
    });

    it("should release the probe client after a successful connect", async () => {
      const client = new FakePoolClient();
      poolFactory = () => new FakePool({ client });
      const cm = new ConnectionManager(config, logger);
      await cm.connect();
      expect(client.released).toBe(true);
    });

    it("should log an info message on successful connect", async () => {
      const cm = new ConnectionManager(config, logger);
      await cm.connect();
      expect(logger.messages("info")).toContain(
        "PostgreSQL connection established successfully",
      );
    });

    it("should return the existing pool if already connected", async () => {
      const cm = new ConnectionManager(config, logger);
      const p1 = await cm.connect();
      const p2 = await cm.connect();
      expect(p1).toBe(p2);
      // Second connect short-circuits — no new pool created.
      expect(createdPools).toHaveLength(1);
    });

    it("should be idempotent across concurrent calls (single in-flight promise)", async () => {
      const cm = new ConnectionManager(config, logger);
      const [a, b, c] = await Promise.all([
        cm.connect(),
        cm.connect(),
        cm.connect(),
      ]);
      expect(a).toBe(b);
      expect(b).toBe(c);
      expect(createdPools).toHaveLength(1);
    });

    it("should wrap a connect failure in a ConnectionError", async () => {
      useFakePool({ connectError: new Error("ECONNREFUSED") });
      const cm = new ConnectionManager(config, logger);
      await expect(cm.connect()).rejects.toThrow(ConnectionError);
      await expect(cm.connect()).rejects.toThrow(
        "Failed to connect to PostgreSQL: ECONNREFUSED",
      );
      expect(cm.isInitialized()).toBe(false);
    });

    it("should preserve the underlying error as the ConnectionError cause", async () => {
      const original = new Error("auth failed");
      useFakePool({ connectError: original });
      const cm = new ConnectionManager(config, logger);
      try {
        await cm.connect();
        throw new Error("expected connect to reject");
      } catch (e) {
        expect(e).toBeInstanceOf(ConnectionError);
        expect((e as ConnectionError).cause).toBe(original);
      }
    });

    it("should log an error on connect failure", async () => {
      useFakePool({ connectError: new Error("boom") });
      const cm = new ConnectionManager(config, logger);
      await expect(cm.connect()).rejects.toThrow(ConnectionError);
      expect(logger.calls.error).toHaveLength(1);
      expect(logger.calls.error[0]!.message).toBe(
        "Failed to establish PostgreSQL connection",
      );
      // `{ error: err.message }` is passed as the 2nd positional arg → ILogger.error's `error` slot.
      expect(logger.calls.error[0]!.error).toEqual({ error: "boom" });
    });
  });

  describe("disconnect", () => {
    it("should close the pool and reset state", async () => {
      const cm = new ConnectionManager(config, logger);
      await cm.connect();
      expect(cm.isInitialized()).toBe(true);
      await cm.disconnect();
      expect(cm.isInitialized()).toBe(false);
      expect(createdPools[0]!.endCalls).toBe(1);
      expect(logger.messages("info")).toContain("PostgreSQL connection closed");
    });

    it("should be a no-op when never connected", async () => {
      const cm = new ConnectionManager(config, logger);
      await expect(cm.disconnect()).resolves.toBeUndefined();
      expect(createdPools).toHaveLength(0);
    });

    it("should allow reconnecting after disconnect (fresh pool)", async () => {
      const cm = new ConnectionManager(config, logger);
      await cm.connect();
      await cm.disconnect();
      await cm.connect();
      expect(cm.isInitialized()).toBe(true);
      expect(createdPools).toHaveLength(2);
    });

    it("should wrap an end() failure in a ConnectionError", async () => {
      const original = new Error("end failed");
      poolFactory = () => new FakePool({ endError: original });
      const cm = new ConnectionManager(config, logger);
      await cm.connect();
      await expect(cm.disconnect()).rejects.toThrow(ConnectionError);
      await expect(cm.disconnect()).rejects.toThrow(
        "Failed to disconnect: end failed",
      );
    });

    it("should log an error when end() fails", async () => {
      poolFactory = () => new FakePool({ endError: new Error("nope") });
      const cm = new ConnectionManager(config, logger);
      await cm.connect();
      await expect(cm.disconnect()).rejects.toThrow(ConnectionError);
      expect(
        logger.calls.error.some(
          (c) => c.message === "Error closing PostgreSQL connection",
        ),
      ).toBe(true);
    });
  });

  describe("getPool", () => {
    it("should throw ConnectionError when not connected", () => {
      const cm = new ConnectionManager(config, logger);
      expect(() => cm.getPool()).toThrow(ConnectionError);
      expect(() => cm.getPool()).toThrow("Not connected to database");
    });

    it("should return the live pool after connect", async () => {
      const cm = new ConnectionManager(config, logger);
      const connected = await cm.connect();
      expect(cm.getPool()).toBe(connected);
    });
  });

  describe("getPoolStats", () => {
    it("should return zero stats when not connected", () => {
      const cm = new ConnectionManager(config, logger);
      expect(cm.getPoolStats()).toEqual({
        totalCount: 0,
        idleCount: 0,
        activeCount: 0,
        waitingCount: 0,
      });
    });

    it("should return live stats from the pool when connected", async () => {
      poolFactory = () =>
        new FakePool({ totalCount: 4, idleCount: 2, waitingCount: 1 });
      const cm = new ConnectionManager(config, logger);
      await cm.connect();
      const stats = cm.getPoolStats();
      // connect() probe incremented totalCount by 1 (4 -> 5).
      expect(stats.totalCount).toBe(5);
      expect(stats.idleCount).toBe(2);
      expect(stats.waitingCount).toBe(1);
    });
  });

  describe("getClient", () => {
    it("should throw ConnectionError when not connected", async () => {
      const cm = new ConnectionManager(config, logger);
      await expect(cm.getClient()).rejects.toThrow(ConnectionError);
    });

    it("should return a client from the pool when connected", async () => {
      const client = new FakePoolClient();
      poolFactory = () => new FakePool({ client });
      const cm = new ConnectionManager(config, logger);
      await cm.connect();
      const got = await cm.getClient();
      expect(got).toBe(client);
      expect(typeof got.query).toBe("function");
      expect(typeof got.release).toBe("function");
    });
  });

  describe("healthCheck", () => {
    it("should return disconnected status when not connected", async () => {
      const cm = new ConnectionManager(config, logger);
      const status = await cm.healthCheck();
      expect(status.connected).toBe(false);
      expect(status.poolStats).toEqual({
        totalCount: 0,
        idleCount: 0,
        activeCount: 0,
        waitingCount: 0,
      });
      expect(status.lastChecked).toBeInstanceOf(Date);
    });

    it("should return connected status when the probe succeeds", async () => {
      const cm = new ConnectionManager(config, logger);
      await cm.connect();
      const status = await cm.healthCheck();
      expect(status.connected).toBe(true);
      expect(status.lastChecked).toBeInstanceOf(Date);
    });

    it("should flip isInitialized to false if the health probe fails", async () => {
      const client = new FakePoolClient({
        queryImpl: async () => {
          throw new Error("dead");
        },
      });
      poolFactory = () => new FakePool({ client });
      const cm = new ConnectionManager(config, logger);
      await cm.connect();
      expect(cm.isInitialized()).toBe(true);
      const status = await cm.healthCheck();
      expect(status.connected).toBe(false);
      expect(cm.isInitialized()).toBe(false);
    });
  });

  describe("isInitialized", () => {
    it("should be false before connect", () => {
      const cm = new ConnectionManager(config, logger);
      expect(cm.isInitialized()).toBe(false);
    });

    it("should be true after connect and false after disconnect", async () => {
      const cm = new ConnectionManager(config, logger);
      await cm.connect();
      expect(cm.isInitialized()).toBe(true);
      await cm.disconnect();
      expect(cm.isInitialized()).toBe(false);
    });
  });

  describe("config exports", () => {
    it("should re-export the pool config factories from the entry point", async () => {
      const mod = await import("../index");
      expect(typeof mod.productionPoolConfig).toBe("function");
      expect(typeof mod.developmentPoolConfig).toBe("function");
      expect(typeof mod.testPoolConfig).toBe("function");
    });
  });
});
