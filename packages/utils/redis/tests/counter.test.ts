import { describe, it, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import {
  initRedis,
  getRedis,
  incrementCounter,
  decrementCounter,
  getCounter,
  resetCounter,
  setCounter,
  disconnectRedis,
} from "../src/index";

describe("Counters", () => {
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
    await redis.del("test-counter");
    await redis.del("test-counter-ttl");
  });

  describe("incrementCounter", () => {
    it("increments counter by 1 by default", async () => {
      const result = await incrementCounter("test-counter");
      expect(result).toBe(1);

      const result2 = await incrementCounter("test-counter");
      expect(result2).toBe(2);
    });

    it("increments by custom amount", async () => {
      const result = await incrementCounter("test-counter", 5);
      expect(result).toBe(5);
    });

    it("sets TTL on first increment", async () => {
      const redis = getRedis();
      await incrementCounter("test-counter-ttl", 1, 300);

      const ttl = await redis.ttl("test-counter-ttl");
      expect(ttl).toBeGreaterThan(290);
      expect(ttl).toBeLessThanOrEqual(300);
    });
  });

  describe("decrementCounter", () => {
    it("decrements counter by 1 by default", async () => {
      await setCounter("test-counter", 10);
      const result = await decrementCounter("test-counter");
      expect(result).toBe(9);
    });

    it("decrements by custom amount", async () => {
      await setCounter("test-counter", 10);
      const result = await decrementCounter("test-counter", 3);
      expect(result).toBe(7);
    });

    it("allows negative values", async () => {
      await resetCounter("test-counter");
      const result = await decrementCounter("test-counter");
      expect(result).toBe(-1);
    });
  });

  describe("getCounter", () => {
    it("returns current counter value", async () => {
      await setCounter("test-counter", 42);
      const result = await getCounter("test-counter");
      expect(result).toBe(42);
    });

    it("returns 0 for non-existent counter", async () => {
      const result = await getCounter("nonexistent-counter");
      expect(result).toBe(0);
    });
  });

  describe("resetCounter", () => {
    it("resets counter to zero", async () => {
      await setCounter("test-counter", 100);
      await resetCounter("test-counter");

      const result = await getCounter("test-counter");
      expect(result).toBe(0);
    });
  });

  describe("setCounter", () => {
    it("sets counter to specific value", async () => {
      await setCounter("test-counter", 123);
      const result = await getCounter("test-counter");
      expect(result).toBe(123);
    });

    it("sets counter with TTL", async () => {
      const redis = getRedis();
      await setCounter("test-counter-ttl", 50, 300);

      const ttl = await redis.ttl("test-counter-ttl");
      expect(ttl).toBeGreaterThan(290);
    });

    it("sets counter without TTL", async () => {
      const redis = getRedis();
      await setCounter("test-counter", 50);

      const ttl = await redis.ttl("test-counter");
      expect(ttl).toBe(-1);
    });
  });
});
