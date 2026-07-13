import { describe, it, expect, beforeEach } from "bun:test";
import { cacheGet, cacheSetTagged, invalidateCacheTags } from "../src/index";
import { createFakeRedis, type FakeRedis } from "./helpers/fakeRedis";

describe("Tagged cache", () => {
  let redis: FakeRedis;

  beforeEach(() => {
    redis = createFakeRedis();
  });

  describe("cacheSetTagged", () => {
    it("stores the value like cacheSet and indexes it under each tag", async () => {
      await cacheSetTagged("users:list", [{ id: 1 }], 60, ["model:user", "lists"], redis);

      expect(await cacheGet("users:list", redis)).toEqual([{ id: 1 }]);
      expect(await redis.smembers("cache-tag:model:user")).toEqual(["users:list"]);
      expect(await redis.smembers("cache-tag:lists")).toEqual(["users:list"]);
    });

    it("applies the TTL to the entry", async () => {
      await cacheSetTagged("k", "v", 10, ["t"], redis);
      redis.advanceTime(11_000);
      expect(await cacheGet("k", redis)).toBeNull();
    });

    it("keeps the tag set alive at least 24h even for short entry TTLs", async () => {
      await cacheSetTagged("k", "v", 10, ["t"], redis);
      expect(await redis.ttl("cache-tag:t")).toBeGreaterThan(10);
    });

    it("works with no tags (plain cache set)", async () => {
      await cacheSetTagged("plain", 42, 60, [], redis);
      expect(await cacheGet("plain", redis)).toBe(42);
    });
  });

  describe("invalidateCacheTags", () => {
    it("deletes every entry carrying the tag and the tag index itself", async () => {
      await cacheSetTagged("a", 1, 60, ["model:user"], redis);
      await cacheSetTagged("b", 2, 60, ["model:user"], redis);
      await cacheSetTagged("c", 3, 60, ["model:post"], redis);

      const removed = await invalidateCacheTags(["model:user"], redis);

      expect(removed).toBe(2);
      expect(await cacheGet("a", redis)).toBeNull();
      expect(await cacheGet("b", redis)).toBeNull();
      expect(await cacheGet("c", redis)).toBe(3); // other tag untouched
      expect(await redis.smembers("cache-tag:model:user")).toEqual([]);
    });

    it("invalidates several tags at once and sums the removals", async () => {
      await cacheSetTagged("a", 1, 60, ["x"], redis);
      await cacheSetTagged("b", 2, 60, ["y"], redis);
      expect(await invalidateCacheTags(["x", "y"], redis)).toBe(2);
    });

    it("counts already-expired members out (DEL of a missing key is a no-op)", async () => {
      await cacheSetTagged("short", 1, 10, ["t"], redis);
      await cacheSetTagged("long", 2, 600, ["t"], redis);
      redis.advanceTime(11_000); // "short" expires; the tag set still lists it

      expect(await invalidateCacheTags(["t"], redis)).toBe(1);
      expect(await cacheGet("long", redis)).toBeNull();
    });

    it("returns 0 for an unknown tag", async () => {
      expect(await invalidateCacheTags(["ghost"], redis)).toBe(0);
    });

    it("an entry with two tags is removed by either, without breaking the other tag", async () => {
      await cacheSetTagged("dual", 1, 60, ["t1", "t2"], redis);
      expect(await invalidateCacheTags(["t1"], redis)).toBe(1);
      expect(await cacheGet("dual", redis)).toBeNull();
      // t2 still lists the (now gone) key; invalidating it removes nothing.
      expect(await invalidateCacheTags(["t2"], redis)).toBe(0);
    });
  });
});
