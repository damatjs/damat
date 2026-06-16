import { describe, it, expect, beforeEach } from "bun:test";
import { checkRateLimit, checkMultiRateLimit } from "../src/index";
import { createFakeRedis, type FakeRedis } from "./helpers/fakeRedis";

describe("Rate Limiting", () => {
  let redis: FakeRedis;

  beforeEach(() => {
    redis = createFakeRedis();
  });

  describe("checkRateLimit", () => {
    it("allows requests under the limit", async () => {
      const result = await checkRateLimit("test-user", 60000, 5, redis);

      expect(result.allowed).toBe(true);
      // First request: maxRequests - currentCount(0) - 1 = 4 remaining.
      expect(result.remaining).toBe(4);
      expect(result.resetAt).toBeGreaterThan(Date.now());
      expect(result.retryAfter).toBeUndefined();
    });

    it("decrements remaining count across requests", async () => {
      await checkRateLimit("test-user", 60000, 3, redis);
      await checkRateLimit("test-user", 60000, 3, redis);
      const result = await checkRateLimit("test-user", 60000, 3, redis);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(0);
    });

    it("blocks requests over the limit and reports retryAfter", async () => {
      await checkRateLimit("test-user", 60000, 2, redis);
      await checkRateLimit("test-user", 60000, 2, redis);
      const result = await checkRateLimit("test-user", 60000, 2, redis);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBeGreaterThan(0);
      // retryAfter must not exceed the window length (in seconds).
      expect(result.retryAfter).toBeLessThanOrEqual(60);
    });

    it("keeps blocking while still over the limit", async () => {
      for (let i = 0; i < 5; i++) {
        await checkRateLimit("test-user", 60000, 2, redis);
      }
      const result = await checkRateLimit("test-user", 60000, 2, redis);
      expect(result.allowed).toBe(false);
    });

    it("resets after the window expires (key TTL elapses)", async () => {
      await checkRateLimit("test-user", 100, 1, redis);
      const blocked = await checkRateLimit("test-user", 100, 1, redis);
      expect(blocked.allowed).toBe(false);

      // The pexpire(windowMs) on the key drops the whole window once elapsed.
      redis.advanceTime(200);

      const allowed = await checkRateLimit("test-user", 100, 1, redis);
      expect(allowed.allowed).toBe(true);
    });

    it("prunes stale entries via zremrangebyscore over real time", async () => {
      // Pre-seed an entry well outside the (tiny) window so it is pruned.
      await redis.zadd("ratelimit:test-user", Date.now() - 10_000, "old:1");
      const result = await checkRateLimit("test-user", 1000, 5, redis);
      expect(result.allowed).toBe(true);
      // After pruning the stale member, only the newly-added one remains.
      expect(await redis.zcard("ratelimit:test-user")).toBe(1);
    });
  });

  describe("checkMultiRateLimit", () => {
    it("allows when all windows are under their limits", async () => {
      const result = await checkMultiRateLimit(
        "test-user",
        [
          { windowMs: 60000, maxRequests: 10 },
          { windowMs: 3600000, maxRequests: 100 },
        ],
        redis,
      );

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(-1);
    });

    it("blocks and reports the first window that is exceeded", async () => {
      for (let i = 0; i < 3; i++) {
        await checkMultiRateLimit(
          "test-user",
          [
            { windowMs: 60000, maxRequests: 2 },
            { windowMs: 3600000, maxRequests: 100 },
          ],
          redis,
        );
      }

      const result = await checkMultiRateLimit(
        "test-user",
        [
          { windowMs: 60000, maxRequests: 2 },
          { windowMs: 3600000, maxRequests: 100 },
        ],
        redis,
      );

      expect(result.allowed).toBe(false);
      expect(result.limitedBy).toBe("minute");
    });

    it("identifies the hour window when it is the bottleneck", async () => {
      // Pre-fill the hour bucket so the minute window passes but the hour fails.
      for (let i = 0; i < 100; i++) {
        await redis.zadd(
          "ratelimit:test-user:hour",
          Date.now() - i * 100,
          `${Date.now() - i * 100}:${Math.random()}`,
        );
      }

      const result = await checkMultiRateLimit(
        "test-user",
        [
          { windowMs: 60000, maxRequests: 100 },
          { windowMs: 3600000, maxRequests: 10 },
        ],
        redis,
      );

      expect(result.allowed).toBe(false);
      expect(result.limitedBy).toBe("hour");
    });

    it("classifies windows as minute/hour/day by duration", async () => {
      // A day window (>= 86400000ms) over its limit should be labeled "day".
      for (let i = 0; i < 5; i++) {
        await redis.zadd(
          "ratelimit:test-user:day",
          Date.now() - i,
          `seed:${i}`,
        );
      }
      const result = await checkMultiRateLimit(
        "test-user",
        [{ windowMs: 86400000, maxRequests: 3 }],
        redis,
      );
      expect(result.allowed).toBe(false);
      expect(result.limitedBy).toBe("day");
    });
  });
});
