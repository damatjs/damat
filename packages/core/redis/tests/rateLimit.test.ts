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

    it("does not record rejected requests, so the window can drain", async () => {
      await checkRateLimit("test-user", 60000, 1, redis);
      for (let i = 0; i < 3; i++) {
        const rejected = await checkRateLimit("test-user", 60000, 1, redis);
        expect(rejected.allowed).toBe(false);
      }
      // Only the single allowed request occupies the window.
      expect(await redis.zcard("ratelimit:test-user")).toBe(1);
    });

    it("does not extend the key TTL on rejected requests", async () => {
      await checkRateLimit("test-user", 60000, 1, redis);
      redis.advanceTime(30_000);
      await checkRateLimit("test-user", 60000, 1, redis); // rejected
      // TTL still counts down from the allowed request; a rejected flood
      // cannot keep re-arming it.
      expect(await redis.pttl("ratelimit:test-user")).toBeLessThanOrEqual(30_000);
    });

    it("allows at most maxRequests across concurrent checks", async () => {
      // The script is atomic, so parallel callers can't all read the same
      // count and pass together.
      const results = await Promise.all(
        Array.from({ length: 5 }, () =>
          checkRateLimit("test-user", 60000, 2, redis),
        ),
      );
      expect(results.filter((r) => r.allowed)).toHaveLength(2);
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

    it("records the request in every window when all allow", async () => {
      const result = await checkMultiRateLimit(
        "test-user",
        [
          { windowMs: 60000, maxRequests: 10 },
          { windowMs: 3600000, maxRequests: 100 },
        ],
        redis,
      );

      expect(result.allowed).toBe(true);
      // A slot was consumed in BOTH windows (all-or-nothing on the allow side).
      expect(await redis.zcard("ratelimit:test-user:minute")).toBe(1);
      expect(await redis.zcard("ratelimit:test-user:hour")).toBe(1);
    });

    it("records in no window when a later window rejects", async () => {
      // Hour is at its limit; minute is wide open and empty.
      await redis.zadd(
        "ratelimit:test-user:hour",
        Date.now(),
        `${Date.now()}:seed`,
      );

      const result = await checkMultiRateLimit(
        "test-user",
        [
          { windowMs: 60000, maxRequests: 10 },
          { windowMs: 3600000, maxRequests: 1 },
        ],
        redis,
      );

      expect(result.allowed).toBe(false);
      expect(result.limitedBy).toBe("hour");
      // The minute window must NOT have been charged for a rejected request.
      expect(await redis.zcard("ratelimit:test-user:minute")).toBe(0);
      // The hour window is unchanged (no new member recorded).
      expect(await redis.zcard("ratelimit:test-user:hour")).toBe(1);
    });

    it("returns retry info from the rejecting window", async () => {
      await redis.zadd(
        "ratelimit:test-user:hour",
        Date.now(),
        `${Date.now()}:seed`,
      );

      const result = await checkMultiRateLimit(
        "test-user",
        [
          { windowMs: 60000, maxRequests: 10 },
          { windowMs: 3600000, maxRequests: 1 },
        ],
        redis,
      );

      // retryAfter reflects the hour window (> a minute), not the minute one.
      expect(result.limitedBy).toBe("hour");
      expect(result.retryAfter).toBeGreaterThan(60);
      expect(result.retryAfter).toBeLessThanOrEqual(3600);
    });

    it("does not extend an earlier window's TTL when a later one rejects", async () => {
      // Minute generous, hour tight (limit 1).
      const windows = [
        { windowMs: 60000, maxRequests: 100 },
        { windowMs: 3600000, maxRequests: 1 },
      ];
      await checkMultiRateLimit("test-user", windows, redis); // allowed, arms TTLs

      redis.advanceTime(30_000);
      const rejected = await checkMultiRateLimit("test-user", windows, redis);
      expect(rejected.allowed).toBe(false);
      expect(rejected.limitedBy).toBe("hour");

      // The minute key keeps counting down from the first (allowed) request; a
      // rejected multi-check must not re-arm it to the full window.
      expect(
        await redis.pttl("ratelimit:test-user:minute"),
      ).toBeLessThanOrEqual(30_000);
      // And nothing new was recorded in the minute window.
      expect(await redis.zcard("ratelimit:test-user:minute")).toBe(1);
    });

    it("rejects a zero-limit window and falls back to now for retry timing", async () => {
      const result = await checkMultiRateLimit(
        "test-user",
        [{ windowMs: 60000, maxRequests: 0 }],
        redis,
      );

      expect(result.allowed).toBe(false);
      expect(result.limitedBy).toBe("minute");
      // Empty window -> no oldest score -> retryAfter derived from `now`.
      expect(result.retryAfter).toBe(60);
      expect(await redis.zcard("ratelimit:test-user:minute")).toBe(0);
    });
  });
});
