import { describe, it, expect, beforeEach } from "bun:test";
import {
  cacheGet,
  cacheSet,
  cacheDelete,
  cacheDeletePattern,
  cacheGetRaw,
  cacheSetRaw,
} from "../src/index";
import { createFakeRedis, type FakeRedis } from "./helpers/fakeRedis";

describe("Cache", () => {
  let redis: FakeRedis;

  beforeEach(() => {
    redis = createFakeRedis();
  });

  describe("cacheSet / cacheGet", () => {
    it("sets and gets cached value (JSON round-trip)", async () => {
      const data = { name: "John", email: "john@example.com" };
      await cacheSet("test-key", data, 300, redis);

      // Stored under the "cache:" prefix and JSON serialized.
      expect(await redis.get("cache:test-key")).toBe(JSON.stringify(data));

      const result = await cacheGet<typeof data>("test-key", redis);
      expect(result).toEqual(data);
    });

    it("serializes non-object values", async () => {
      await cacheSet("num", 42, 300, redis);
      expect(await cacheGet<number>("num", redis)).toBe(42);

      await cacheSet("bool", true, 300, redis);
      expect(await cacheGet<boolean>("bool", redis)).toBe(true);

      await cacheSet("arr", [1, 2, 3], 300, redis);
      expect(await cacheGet<number[]>("arr", redis)).toEqual([1, 2, 3]);
    });

    it("uses default TTL of 300 seconds", async () => {
      await cacheSet("test-key", { value: 1 }, undefined, redis);

      const ttl = await redis.ttl("cache:test-key");
      expect(ttl).toBeGreaterThan(295);
      expect(ttl).toBeLessThanOrEqual(300);
    });

    it("honors a custom TTL", async () => {
      await cacheSet("test-key", { value: 1 }, 60, redis);
      const ttl = await redis.ttl("cache:test-key");
      expect(ttl).toBeGreaterThan(55);
      expect(ttl).toBeLessThanOrEqual(60);
    });

    it("expires the value after its TTL elapses", async () => {
      await cacheSet("test-key", { value: 1 }, 10, redis);
      expect(await cacheGet("test-key", redis)).toEqual({ value: 1 });

      redis.advanceTime(11_000);
      expect(await cacheGet("test-key", redis)).toBeNull();
    });

    it("returns null for non-existent key", async () => {
      expect(await cacheGet("nonexistent", redis)).toBeNull();
    });

    it("returns null for invalid JSON instead of throwing", async () => {
      await redis.set("cache:invalid", "not json");
      expect(await cacheGet("invalid", redis)).toBeNull();
    });

    it("leaves a corrupt value in place on parse failure", async () => {
      await redis.set("cache:corrupt", "{not-json");

      // The graceful path returns null but does NOT delete or rewrite the key,
      // so the raw value stays inspectable (e.g. via cacheGetRaw).
      expect(await cacheGet("corrupt", redis)).toBeNull();
      expect(await redis.get("cache:corrupt")).toBe("{not-json");
      expect(await cacheGetRaw("corrupt", redis)).toBe("{not-json");
    });

    it("returns null when stored value is an empty string (falsy)", async () => {
      await redis.set("cache:empty", "");
      expect(await cacheGet("empty", redis)).toBeNull();
    });
  });

  describe("cacheDelete", () => {
    it("deletes cached value", async () => {
      await cacheSet("test-key", { value: 1 }, 300, redis);
      await cacheDelete("test-key", redis);

      expect(await cacheGet("test-key", redis)).toBeNull();
    });

    it("does not error on non-existent key", async () => {
      await expect(cacheDelete("nonexistent", redis)).resolves.toBeUndefined();
    });
  });

  describe("cacheDeletePattern", () => {
    it("deletes all keys matching pattern but leaves others", async () => {
      await cacheSet("user:1", { id: 1 }, 300, redis);
      await cacheSet("user:2", { id: 2 }, 300, redis);
      await cacheSet("other", { id: 3 }, 300, redis);

      await cacheDeletePattern("user:*", redis);

      expect(await cacheGet("user:1", redis)).toBeNull();
      expect(await cacheGet("user:2", redis)).toBeNull();
      expect(await cacheGet("other", redis)).not.toBeNull();
    });

    it("does not error when no keys match", async () => {
      await expect(
        cacheDeletePattern("nonexistent:*", redis),
      ).resolves.toBeUndefined();
    });

    it("matches the pattern against the prefixed key", async () => {
      // deletePattern prepends CACHE_PREFIX, so "cache:*" should NOT match
      // because the actual key is "cache:cache:*".
      await cacheSet("a", { v: 1 }, 300, redis);
      await cacheDeletePattern("nope:*", redis);
      expect(await cacheGet("a", redis)).not.toBeNull();
    });
  });

  describe("cacheSetRaw / cacheGetRaw", () => {
    it("sets and gets raw string without JSON parsing", async () => {
      await cacheSetRaw("raw-key", "raw string value", 300, redis);

      expect(await cacheGetRaw("raw-key", redis)).toBe("raw string value");
      // Stored verbatim, not JSON-encoded.
      expect(await redis.get("cache:raw-key")).toBe("raw string value");
    });

    it("applies TTL via setex when provided", async () => {
      await cacheSetRaw("raw-key", "with ttl", 120, redis);
      const ttl = await redis.ttl("cache:raw-key");
      expect(ttl).toBeGreaterThan(115);
      expect(ttl).toBeLessThanOrEqual(120);
    });

    it("sets without TTL when not provided", async () => {
      await cacheSetRaw("raw-key", "no expiry", undefined, redis);
      // -1 means the key exists with no expiry.
      expect(await redis.ttl("cache:raw-key")).toBe(-1);
    });

    it("treats ttl of 0 as no expiry (falsy)", async () => {
      await cacheSetRaw("raw-key", "zero ttl", 0, redis);
      expect(await redis.ttl("cache:raw-key")).toBe(-1);
      expect(await cacheGetRaw("raw-key", redis)).toBe("zero ttl");
    });

    it("returns null for non-existent key", async () => {
      expect(await cacheGetRaw("nonexistent", redis)).toBeNull();
    });
  });
});
