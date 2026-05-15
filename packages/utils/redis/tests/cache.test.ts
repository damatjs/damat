import { describe, it, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import {
  initRedis,
  getRedis,
  cacheGet,
  cacheSet,
  cacheDelete,
  cacheDeletePattern,
  cacheGetRaw,
  cacheSetRaw,
  disconnectRedis,
} from "../src/index";

describe("Cache", () => {
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
    await redis.del("cache:test-key");
    await redis.del("cache:user:1");
    await redis.del("cache:user:2");
    await redis.del("cache:raw-key");
  });

  describe("cacheSet / cacheGet", () => {
    it("sets and gets cached value", async () => {
      const data = { name: "John", email: "john@example.com" };
      await cacheSet("test-key", data, 300);

      const result = await cacheGet<{ name: string; email: string }>("test-key");
      expect(result).toEqual(data);
    });

    it("uses default TTL of 300 seconds", async () => {
      const redis = getRedis();
      await cacheSet("test-key", { value: 1 });

      const ttl = await redis.ttl("cache:test-key");
      expect(ttl).toBeGreaterThan(290);
      expect(ttl).toBeLessThanOrEqual(300);
    });

    it("returns null for non-existent key", async () => {
      const result = await cacheGet("nonexistent");
      expect(result).toBeNull();
    });

    it("returns null for invalid JSON", async () => {
      const redis = getRedis();
      await redis.set("cache:invalid", "not json");
      const result = await cacheGet("invalid");
      expect(result).toBeNull();
      await redis.del("cache:invalid");
    });
  });

  describe("cacheDelete", () => {
    it("deletes cached value", async () => {
      await cacheSet("test-key", { value: 1 }, 300);
      await cacheDelete("test-key");

      const result = await cacheGet("test-key");
      expect(result).toBeNull();
    });

    it("does not error on non-existent key", async () => {
      await expect(cacheDelete("nonexistent")).resolves.toBeUndefined();
    });
  });

  describe("cacheDeletePattern", () => {
    it("deletes all keys matching pattern", async () => {
      await cacheSet("user:1", { id: 1 }, 300);
      await cacheSet("user:2", { id: 2 }, 300);
      await cacheSet("other", { id: 3 }, 300);

      await cacheDeletePattern("user:*");

      expect(await cacheGet("user:1")).toBeNull();
      expect(await cacheGet("user:2")).toBeNull();
      expect(await cacheGet("other")).not.toBeNull();

      const redis = getRedis();
      await redis.del("cache:other");
    });

    it("does not error when no keys match", async () => {
      await expect(cacheDeletePattern("nonexistent:*")).resolves.toBeUndefined();
    });
  });

  describe("cacheSetRaw / cacheGetRaw", () => {
    it("sets and gets raw string without JSON parsing", async () => {
      await cacheSetRaw("raw-key", "raw string value", 300);

      const result = await cacheGetRaw("raw-key");
      expect(result).toBe("raw string value");
    });

    it("sets without TTL when not provided", async () => {
      const redis = getRedis();
      await cacheSetRaw("raw-key", "no expiry");

      const ttl = await redis.ttl("cache:raw-key");
      expect(ttl).toBe(-1);
    });

    it("returns null for non-existent key", async () => {
      const result = await cacheGetRaw("nonexistent");
      expect(result).toBeNull();
    });
  });
});
