import { describe, it, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import { Redis } from "@damatjs/deps/ioredis";
import {
  createRedis,
  cacheGet,
  cacheSet,
  cacheDelete,
  cacheDeletePattern,
  cacheGetRaw,
  cacheSetRaw,
  disconnect,
} from "../src/index";

describe("Cache", () => {
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
    await redis.del("cache:test-key");
    await redis.del("cache:user:1");
    await redis.del("cache:user:2");
    await redis.del("cache:raw-key");
  });

  describe("cacheSet / cacheGet", () => {
    it("sets and gets cached value", async () => {
      const data = { name: "John", email: "john@example.com" };
      await cacheSet(redis, "test-key", data, 300);

      const result = await cacheGet<{ name: string; email: string }>(
        redis,
        "test-key",
      );
      expect(result).toEqual(data);
    });

    it("uses default TTL of 300 seconds", async () => {
      await cacheSet(redis, "test-key", { value: 1 });

      const ttl = await redis.ttl("cache:test-key");
      expect(ttl).toBeGreaterThan(290);
      expect(ttl).toBeLessThanOrEqual(300);
    });

    it("returns null for non-existent key", async () => {
      const result = await cacheGet(redis, "nonexistent");
      expect(result).toBeNull();
    });

    it("returns null for invalid JSON", async () => {
      await redis.set("cache:invalid", "not json");
      const result = await cacheGet(redis, "invalid");
      expect(result).toBeNull();
      await redis.del("cache:invalid");
    });
  });

  describe("cacheDelete", () => {
    it("deletes cached value", async () => {
      await cacheSet(redis, "test-key", { value: 1 }, 300);
      await cacheDelete(redis, "test-key");

      const result = await cacheGet(redis, "test-key");
      expect(result).toBeNull();
    });

    it("does not error on non-existent key", async () => {
      await expect(cacheDelete(redis, "nonexistent")).resolves.toBeUndefined();
    });
  });

  describe("cacheDeletePattern", () => {
    it("deletes all keys matching pattern", async () => {
      await cacheSet(redis, "user:1", { id: 1 }, 300);
      await cacheSet(redis, "user:2", { id: 2 }, 300);
      await cacheSet(redis, "other", { id: 3 }, 300);

      await cacheDeletePattern(redis, "user:*");

      expect(await cacheGet(redis, "user:1")).toBeNull();
      expect(await cacheGet(redis, "user:2")).toBeNull();
      expect(await cacheGet(redis, "other")).not.toBeNull();

      await redis.del("cache:other");
    });

    it("does not error when no keys match", async () => {
      await expect(
        cacheDeletePattern(redis, "nonexistent:*"),
      ).resolves.toBeUndefined();
    });
  });

  describe("cacheSetRaw / cacheGetRaw", () => {
    it("sets and gets raw string without JSON parsing", async () => {
      await cacheSetRaw(redis, "raw-key", "raw string value", 300);

      const result = await cacheGetRaw(redis, "raw-key");
      expect(result).toBe("raw string value");
    });

    it("sets without TTL when not provided", async () => {
      await cacheSetRaw(redis, "raw-key", "no expiry");

      const ttl = await redis.ttl("cache:raw-key");
      expect(ttl).toBe(-1);
    });

    it("returns null for non-existent key", async () => {
      const result = await cacheGetRaw(redis, "nonexistent");
      expect(result).toBeNull();
    });
  });
});
