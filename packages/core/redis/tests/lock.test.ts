import { describe, it, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import { initRedis, getRedis, acquireLock, releaseLock, withLock, disconnectRedis } from "../src/index";

describe("Distributed Locks", () => {
  beforeAll(async () => {
    initRedis({
      url: process.env.REDIS_URL || "redis://localhost:6379",
    });
    const redis = getRedis();
    await redis.ping();
  });

  afterAll(async () => {
    await disconnectRedis();
  });

  beforeEach(async () => {
    const redis = getRedis();
    await redis.del("lock:test-lock");
  });

  describe("acquireLock", () => {
    it("acquires lock successfully", async () => {
      const redis = getRedis();
      const lockValue = await acquireLock("test-lock", 10000);
      expect(lockValue).not.toBeNull();

      const stored = await redis.get("lock:test-lock");
      expect(stored).toBe(lockValue);
    });

    it("returns null when lock is already held", async () => {
      const lock1 = await acquireLock("test-lock", 10000);
      expect(lock1).not.toBeNull();

      const lock2 = await acquireLock("test-lock", 10000);
      expect(lock2).toBeNull();
    });

    it("lock expires after TTL", async () => {
      const redis = getRedis();
      await acquireLock("test-lock", 100);

      await new Promise((resolve) => setTimeout(resolve, 150));

      const stored = await redis.get("lock:test-lock");
      expect(stored).toBeNull();
    });
  });

  describe("releaseLock", () => {
    it("releases lock with correct value", async () => {
      const redis = getRedis();
      const lockValue = await acquireLock("test-lock", 10000);

      const released = await releaseLock("test-lock", lockValue!);
      expect(released).toBe(true);

      const stored = await redis.get("lock:test-lock");
      expect(stored).toBeNull();
    });

    it("does not release lock with wrong value", async () => {
      const redis = getRedis();
      const lockValue = await acquireLock("test-lock", 10000);

      const released = await releaseLock("test-lock", "wrong-value");
      expect(released).toBe(false);

      const stored = await redis.get("lock:test-lock");
      expect(stored).toBe(lockValue);
    });

    it("returns false for non-existent lock", async () => {
      const released = await releaseLock("test-lock", "any-value");
      expect(released).toBe(false);
    });
  });

  describe("withLock", () => {
    it("executes function while holding lock", async () => {
      const redis = getRedis();
      const result = await withLock("test-lock", async () => {
        const isHeld = await redis.get("lock:test-lock");
        expect(isHeld).not.toBeNull();
        return "success";
      }, 10000);

      expect(result).toBe("success");

      const stored = await redis.get("lock:test-lock");
      expect(stored).toBeNull();
    });

    it("releases lock even if function throws", async () => {
      const redis = getRedis();
      try {
        await withLock("test-lock", async () => {
          throw new Error("Test error");
        }, 10000);
      } catch (e) {
        expect((e as Error).message).toBe("Test error");
      }

      const stored = await redis.get("lock:test-lock");
      expect(stored).toBeNull();
    });

    it("throws when lock cannot be acquired", async () => {
      await acquireLock("test-lock", 10000);

      await expect(
        withLock("test-lock", async () => "never runs", 10000),
      ).rejects.toThrow("Could not acquire lock: test-lock");
    });
  });
});
