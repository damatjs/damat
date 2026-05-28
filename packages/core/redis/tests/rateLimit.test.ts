import { describe, it, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import {
  initRedis,
  getRedis,
  checkRateLimit,
  checkMultiRateLimit,
  disconnectRedis,
} from "../src/index";

describe("Rate Limiting", () => {
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
    await redis.del("ratelimit:test-user");
    await redis.del("ratelimit:test-user:minute");
    await redis.del("ratelimit:test-user:hour");
    await redis.del("ratelimit:test-user:day");
  });

  describe("checkRateLimit", () => {
    it("allows requests under limit", async () => {
      const result = await checkRateLimit("test-user", 60000, 5);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4);
      expect(result.resetAt).toBeGreaterThan(Date.now());
    });

    it("decrements remaining count", async () => {
      await checkRateLimit("test-user", 60000, 3);
      await checkRateLimit("test-user", 60000, 3);
      const result = await checkRateLimit("test-user", 60000, 3);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(0);
    });

    it("blocks requests over limit", async () => {
      await checkRateLimit("test-user", 60000, 2);
      await checkRateLimit("test-user", 60000, 2);
      const result = await checkRateLimit("test-user", 60000, 2);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    it("resets after window expires", async () => {
      await checkRateLimit("test-user", 100, 1);
      await checkRateLimit("test-user", 100, 1);

      const blocked = await checkRateLimit("test-user", 100, 1);
      expect(blocked.allowed).toBe(false);

      await new Promise((resolve) => setTimeout(resolve, 150));

      const allowed = await checkRateLimit("test-user", 100, 1);
      expect(allowed.allowed).toBe(true);
    });
  });

  describe("checkMultiRateLimit", () => {
    it("checks multiple windows", async () => {
      const result = await checkMultiRateLimit("test-user", [
        { windowMs: 60000, maxRequests: 10 },
        { windowMs: 3600000, maxRequests: 100 },
      ]);

      expect(result.allowed).toBe(true);
    });

    it("blocks when any window is exceeded", async () => {
      for (let i = 0; i < 3; i++) {
        await checkMultiRateLimit("test-user", [
          { windowMs: 60000, maxRequests: 2 },
          { windowMs: 3600000, maxRequests: 100 },
        ]);
      }

      const result = await checkMultiRateLimit("test-user", [
        { windowMs: 60000, maxRequests: 2 },
        { windowMs: 3600000, maxRequests: 100 },
      ]);

      expect(result.allowed).toBe(false);
      expect(result.limitedBy).toBe("minute");
    });

    it("identifies which window triggered limit", async () => {
      const redis = getRedis();
      for (let i = 0; i < 100; i++) {
        await redis.zadd(
          "ratelimit:test-user:hour",
          Date.now() - i * 100,
          `${Date.now() - i * 100}:${Math.random()}`,
        );
      }

      const result = await checkMultiRateLimit("test-user", [
        { windowMs: 60000, maxRequests: 100 },
        { windowMs: 3600000, maxRequests: 10 },
      ]);

      expect(result.allowed).toBe(false);
      expect(result.limitedBy).toBe("hour");
    });
  });
});
