import { describe, it, expect, afterAll } from "bun:test";
import { createRedis, disconnect, initRedis, getRedis, hasRedis, disconnectRedis } from "../src/index";

describe("Redis Client", () => {
  afterAll(async () => {
    if (hasRedis()) {
      await disconnectRedis();
    }
  });

  describe("createRedis", () => {
    it("creates a Redis client", async () => {
      const redis = createRedis({
        url: process.env.REDIS_URL || "redis://localhost:6379",
      });

      await redis.connect();
      const pong = await redis.ping();
      expect(pong).toBe("PONG");

      await disconnect(redis);
    });

    it("uses lazy connect by default", async () => {
      const redis = createRedis({
        url: process.env.REDIS_URL || "redis://localhost:6379",
        lazyConnect: true,
      });

      const status = redis.status;
      expect(status).toBe("wait");

      await disconnect(redis);
    });

    it("can set custom retry options", async () => {
      const redis = createRedis({
        url: process.env.REDIS_URL || "redis://localhost:6379",
        maxRetriesPerRequest: 5,
      });

      await redis.ping();
      await disconnect(redis);
    });
  });

  describe("disconnect", () => {
    it("disconnects from Redis", async () => {
      const redis = createRedis({
        url: process.env.REDIS_URL || "redis://localhost:6379",
      });

      await redis.ping();
      await disconnect(redis);
      await new Promise((r) => setTimeout(r, 50));

      expect(["end", "close"]).toContain(redis.status);
    });
  });

  describe("singleton", () => {
    it("initRedis initializes global redis", async () => {
      initRedis({
        url: process.env.REDIS_URL || "redis://localhost:6379",
      });

      expect(hasRedis()).toBe(true);
      const redis = getRedis();
      const pong = await redis.ping();
      expect(pong).toBe("PONG");

      await disconnectRedis();
      expect(hasRedis()).toBe(false);
    });
  });
});
