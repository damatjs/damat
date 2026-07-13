import { describe, it, expect, beforeEach } from "bun:test";
import {
  incrementCounter,
  decrementCounter,
  getCounter,
  resetCounter,
  setCounter,
} from "../src/index";
import { createFakeRedis, type FakeRedis } from "./helpers/fakeRedis";

describe("Counters", () => {
  let redis: FakeRedis;

  beforeEach(() => {
    redis = createFakeRedis();
  });

  describe("incrementCounter", () => {
    it("increments counter by 1 by default", async () => {
      expect(
        await incrementCounter("test-counter", undefined, undefined, redis),
      ).toBe(1);
      expect(
        await incrementCounter("test-counter", undefined, undefined, redis),
      ).toBe(2);
    });

    it("increments by custom amount", async () => {
      expect(await incrementCounter("test-counter", 5, undefined, redis)).toBe(
        5,
      );
      expect(await incrementCounter("test-counter", 5, undefined, redis)).toBe(
        10,
      );
    });

    it("sets TTL when provided", async () => {
      await incrementCounter("test-counter-ttl", 1, 300, redis);

      const ttl = await redis.ttl("test-counter-ttl");
      expect(ttl).toBeGreaterThan(295);
      expect(ttl).toBeLessThanOrEqual(300);
    });

    it("does not set a TTL when ttlSeconds is omitted", async () => {
      await incrementCounter("test-counter", 1, undefined, redis);
      // -1 = key exists with no expiry.
      expect(await redis.ttl("test-counter")).toBe(-1);
    });

    it("sets TTL only on the first increment (no refresh)", async () => {
      await incrementCounter("test-counter-ttl", 1, 300, redis);
      redis.advanceTime(100_000);
      // Steady increments must NOT re-arm the expiry or the counter never dies.
      await incrementCounter("test-counter-ttl", 1, 300, redis);
      const ttl = await redis.ttl("test-counter-ttl");
      expect(ttl).toBeLessThanOrEqual(200);
      expect(ttl).toBeGreaterThan(195);
    });

    it("expires under steady increment traffic", async () => {
      await incrementCounter("test-counter-ttl", 1, 100, redis);
      redis.advanceTime(60_000);
      await incrementCounter("test-counter-ttl", 1, 100, redis);
      redis.advanceTime(60_000);
      // 120s elapsed > 100s TTL from the FIRST increment: the key is gone.
      expect(await redis.ttl("test-counter-ttl")).toBe(-2);
      expect(await getCounter("test-counter-ttl", redis)).toBe(0);
    });

    it("arms a TTL on an existing counter that has none", async () => {
      await incrementCounter("test-counter", 1, undefined, redis);
      expect(await redis.ttl("test-counter")).toBe(-1);
      // Passing a TTL later applies it because the key had no expiry yet.
      await incrementCounter("test-counter", 1, 300, redis);
      expect(await redis.ttl("test-counter")).toBeGreaterThan(295);
    });
  });

  describe("decrementCounter", () => {
    it("decrements counter by 1 by default", async () => {
      await setCounter("test-counter", 10, undefined, redis);
      expect(await decrementCounter("test-counter", undefined, redis)).toBe(9);
    });

    it("decrements by custom amount", async () => {
      await setCounter("test-counter", 10, undefined, redis);
      expect(await decrementCounter("test-counter", 3, redis)).toBe(7);
    });

    it("allows negative values from zero", async () => {
      await resetCounter("test-counter", redis);
      expect(await decrementCounter("test-counter", undefined, redis)).toBe(-1);
    });
  });

  describe("getCounter", () => {
    it("returns current counter value", async () => {
      await setCounter("test-counter", 42, undefined, redis);
      expect(await getCounter("test-counter", redis)).toBe(42);
    });

    it("returns 0 for non-existent counter", async () => {
      expect(await getCounter("nonexistent-counter", redis)).toBe(0);
    });

    it("parses stored string value as an integer", async () => {
      await redis.set("manual", "57");
      expect(await getCounter("manual", redis)).toBe(57);
    });
  });

  describe("resetCounter", () => {
    it("resets counter to zero by deleting the key", async () => {
      await setCounter("test-counter", 100, undefined, redis);
      await resetCounter("test-counter", redis);
      expect(await getCounter("test-counter", redis)).toBe(0);
      expect(await redis.get("test-counter")).toBeNull();
    });
  });

  describe("setCounter", () => {
    it("sets counter to specific value", async () => {
      await setCounter("test-counter", 123, undefined, redis);
      expect(await getCounter("test-counter", redis)).toBe(123);
    });

    it("sets counter with TTL", async () => {
      await setCounter("test-counter-ttl", 50, 300, redis);
      const ttl = await redis.ttl("test-counter-ttl");
      expect(ttl).toBeGreaterThan(295);
      expect(ttl).toBeLessThanOrEqual(300);
    });

    it("sets counter without TTL", async () => {
      await setCounter("test-counter", 50, undefined, redis);
      expect(await redis.ttl("test-counter")).toBe(-1);
    });

    it("stores the value as a string so getCounter can parse it", async () => {
      await setCounter("test-counter", 7, undefined, redis);
      expect(await redis.get("test-counter")).toBe("7");
    });
  });
});
