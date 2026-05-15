import { describe, it, expect } from "bun:test";
import { createRedis, disconnect } from "../src/index";

describe("Redis Client", () => {
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
});
