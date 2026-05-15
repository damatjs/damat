import { describe, it, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import { Redis } from "@damatjs/deps/ioredis";
import {
  createRedis,
  incrementCounter,
  decrementCounter,
  getCounter,
  resetCounter,
  setCounter,
  disconnect,
} from "../src/index";

describe("Counters", () => {
  let redis: Redis;

  beforeAll(async () => {
    redis = createRedis({
      url: process.env.REDIS_URL || "redis://localhost:6379",
    });
    await redis.ping();
  });

  afterAll(async () => {
    await disconnect(redis);
  });

  beforeEach(async () => {
    await redis.del("test-counter");
    await redis.del("test-counter-ttl");
  });

  describe("incrementCounter", () => {
    it("increments counter by 1 by default", async () => {
      const result = await incrementCounter(redis, "test-counter");
      expect(result).toBe(1);

      const result2 = await incrementCounter(redis, "test-counter");
      expect(result2).toBe(2);
    });

    it("increments by custom amount", async () => {
      const result = await incrementCounter(redis, "test-counter", 5);
      expect(result).toBe(5);
    });

    it("sets TTL on first increment", async () => {
      await incrementCounter(redis, "test-counter-ttl", 1, 300);

      const ttl = await redis.ttl("test-counter-ttl");
      expect(ttl).toBeGreaterThan(290);
      expect(ttl).toBeLessThanOrEqual(300);
    });
  });

  describe("decrementCounter", () => {
    it("decrements counter by 1 by default", async () => {
      await setCounter(redis, "test-counter", 10);
      const result = await decrementCounter(redis, "test-counter");
      expect(result).toBe(9);
    });

    it("decrements by custom amount", async () => {
      await setCounter(redis, "test-counter", 10);
      const result = await decrementCounter(redis, "test-counter", 3);
      expect(result).toBe(7);
    });

    it("allows negative values", async () => {
      await resetCounter(redis, "test-counter");
      const result = await decrementCounter(redis, "test-counter");
      expect(result).toBe(-1);
    });
  });

  describe("getCounter", () => {
    it("returns current counter value", async () => {
      await setCounter(redis, "test-counter", 42);
      const result = await getCounter(redis, "test-counter");
      expect(result).toBe(42);
    });

    it("returns 0 for non-existent counter", async () => {
      const result = await getCounter(redis, "nonexistent-counter");
      expect(result).toBe(0);
    });
  });

  describe("resetCounter", () => {
    it("resets counter to zero", async () => {
      await setCounter(redis, "test-counter", 100);
      await resetCounter(redis, "test-counter");

      const result = await getCounter(redis, "test-counter");
      expect(result).toBe(0);
    });
  });

  describe("setCounter", () => {
    it("sets counter to specific value", async () => {
      await setCounter(redis, "test-counter", 123);
      const result = await getCounter(redis, "test-counter");
      expect(result).toBe(123);
    });

    it("sets counter with TTL", async () => {
      await setCounter(redis, "test-counter-ttl", 50, 300);

      const ttl = await redis.ttl("test-counter-ttl");
      expect(ttl).toBeGreaterThan(290);
    });

    it("sets counter without TTL", async () => {
      await setCounter(redis, "test-counter", 50);

      const ttl = await redis.ttl("test-counter");
      expect(ttl).toBe(-1);
    });
  });
});
