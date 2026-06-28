import { describe, it, expect, beforeEach } from "bun:test";
import {
  acquireLock,
  releaseLock,
  withLock,
  extendLock,
  isLocked,
} from "../src/index";
import { createFakeRedis, type FakeRedis } from "./helpers/fakeRedis";

describe("Distributed Locks", () => {
  let redis: FakeRedis;

  beforeEach(() => {
    redis = createFakeRedis();
  });

  describe("acquireLock", () => {
    it("acquires lock successfully and stores the lock value", async () => {
      const lockValue = await acquireLock("test-lock", 10000, redis);
      expect(lockValue).not.toBeNull();

      // Stored under the "lock:" prefix with the returned value.
      expect(await redis.get("lock:test-lock")).toBe(lockValue);
    });

    it("returns null when lock is already held (contention)", async () => {
      const lock1 = await acquireLock("test-lock", 10000, redis);
      expect(lock1).not.toBeNull();

      const lock2 = await acquireLock("test-lock", 10000, redis);
      expect(lock2).toBeNull();

      // The original lock value must be untouched.
      expect(await redis.get("lock:test-lock")).toBe(lock1);
    });

    it("returns distinct lock values across keys", async () => {
      const a = await acquireLock("lock-a", 10000, redis);
      const b = await acquireLock("lock-b", 10000, redis);
      expect(a).not.toBeNull();
      expect(b).not.toBeNull();
      expect(a).not.toBe(b);
    });

    it("lock expires after its TTL, allowing re-acquisition", async () => {
      const first = await acquireLock("test-lock", 100, redis);
      expect(first).not.toBeNull();

      redis.advanceTime(150);

      expect(await redis.get("lock:test-lock")).toBeNull();
      const second = await acquireLock("test-lock", 100, redis);
      expect(second).not.toBeNull();
      expect(second).not.toBe(first);
    });
  });

  describe("releaseLock", () => {
    it("releases lock with correct value", async () => {
      const lockValue = await acquireLock("test-lock", 10000, redis);

      const released = await releaseLock("test-lock", lockValue!, redis);
      expect(released).toBe(true);
      expect(await redis.get("lock:test-lock")).toBeNull();
    });

    it("does not release lock with wrong value", async () => {
      const lockValue = await acquireLock("test-lock", 10000, redis);

      const released = await releaseLock("test-lock", "wrong-value", redis);
      expect(released).toBe(false);

      // Lock must remain held by the original owner.
      expect(await redis.get("lock:test-lock")).toBe(lockValue);
    });

    it("returns false for non-existent lock", async () => {
      const released = await releaseLock("test-lock", "any-value", redis);
      expect(released).toBe(false);
    });
  });

  describe("withLock", () => {
    it("executes function while holding the lock and releases after", async () => {
      let observedHeld: string | null = null;
      const result = await withLock(
        "test-lock",
        async () => {
          observedHeld = await redis.get("lock:test-lock");
          return "success";
        },
        10000,
        redis,
      );

      expect(result).toBe("success");
      // The lock was held during execution...
      expect(observedHeld).not.toBeNull();
      // ...and released afterward.
      expect(await redis.get("lock:test-lock")).toBeNull();
    });

    it("releases the lock even if the function throws", async () => {
      await expect(
        withLock(
          "test-lock",
          async () => {
            throw new Error("Test error");
          },
          10000,
          redis,
        ),
      ).rejects.toThrow("Test error");

      // finally{} must have released the lock.
      expect(await redis.get("lock:test-lock")).toBeNull();
    });

    it("throws when the lock cannot be acquired and never runs the fn", async () => {
      await acquireLock("test-lock", 10000, redis);

      let ran = false;
      await expect(
        withLock(
          "test-lock",
          async () => {
            ran = true;
            return "never runs";
          },
          10000,
          redis,
        ),
      ).rejects.toThrow("Could not acquire lock: test-lock");

      expect(ran).toBe(false);
    });

    it("does not release a lock it never acquired", async () => {
      // A different owner holds the lock.
      const otherOwner = await acquireLock("test-lock", 10000, redis);

      await expect(
        withLock("test-lock", async () => "x", 10000, redis),
      ).rejects.toThrow("Could not acquire lock: test-lock");

      // The other owner's lock must survive.
      expect(await redis.get("lock:test-lock")).toBe(otherOwner);
    });
  });

  describe("extendLock", () => {
    it("extends the TTL when the lock is still held with the given value", async () => {
      const lockValue = await acquireLock("test-lock", 100, redis);
      expect(lockValue).not.toBeNull();

      // Re-arm to a much longer TTL.
      const extended = await extendLock("test-lock", lockValue!, 10000, redis);
      expect(extended).toBe(true);

      // The lock survives well past the ORIGINAL 100ms TTL.
      redis.advanceTime(150);
      expect(await redis.get("lock:test-lock")).toBe(lockValue);
    });

    it("returns false when the lock value does not match", async () => {
      await acquireLock("test-lock", 10000, redis);
      const extended = await extendLock("test-lock", "wrong-value", 10000, redis);
      expect(extended).toBe(false);
    });

    it("returns false when the lock does not exist", async () => {
      const extended = await extendLock("missing", "any", 10000, redis);
      expect(extended).toBe(false);
    });
  });

  describe("isLocked", () => {
    it("returns true while the lock is held and false once released", async () => {
      expect(await isLocked("test-lock", redis)).toBe(false);

      const lockValue = await acquireLock("test-lock", 10000, redis);
      expect(await isLocked("test-lock", redis)).toBe(true);

      await releaseLock("test-lock", lockValue!, redis);
      expect(await isLocked("test-lock", redis)).toBe(false);
    });

    it("returns false after the lock TTL expires", async () => {
      await acquireLock("test-lock", 100, redis);
      expect(await isLocked("test-lock", redis)).toBe(true);
      redis.advanceTime(150);
      expect(await isLocked("test-lock", redis)).toBe(false);
    });
  });
});
