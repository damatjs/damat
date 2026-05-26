import { describe, it, expect, beforeEach } from "bun:test";
import { PoolManager } from "../../manager/pool";

describe("PoolManager", () => {
  beforeEach(() => {
    PoolManager.reset();
  });

  describe("setup and initialization", () => {
    it("starts uninitialized", () => {
      expect(PoolManager.isInitialized()).toBe(false);
      expect(PoolManager.hasEntityManager()).toBe(false);
    });

    it("throws error when getting pool before setup", () => {
      expect(() => PoolManager.getPool()).toThrow(
        "Pool not initialized. Call PoolManager.setup(pool) first."
      );
    });

    it("throws error when getting entity manager before setup", () => {
      expect(() => PoolManager.getPgEntityManager()).toThrow(
        "EntityManager not initialized. Call PoolManager.setup(pool) first."
      );
    });
  });

  describe("reset", () => {
    it("resets all internal state", () => {
      PoolManager.reset();
      expect(PoolManager.isInitialized()).toBe(false);
      expect(PoolManager.hasEntityManager()).toBe(false);
      expect(PoolManager.getConnectionManager()).toBe(null);
    });
  });

  describe("connection manager", () => {
    it("returns null for connection manager when not set", () => {
      expect(PoolManager.getConnectionManager()).toBe(null);
    });
  });

  describe("getStats", () => {
    it("throws when pool not initialized", () => {
      expect(() => PoolManager.getStats()).toThrow();
    });
  });

  describe("healthCheck", () => {
    it("returns false when pool not initialized and no connection manager", async () => {
      const result = await PoolManager.healthCheck();
      expect(result).toBe(false);
    });
  });
});
