import { describe, it, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import { Redis } from "@damatjs/deps/ioredis";
import { createRedis, disconnect } from "../src/index";
import { SessionManager, createSessionManager } from "./sessionManager";

describe("SessionManager", () => {
  let redis: Redis;
  let manager: SessionManager<{ userId: string; role: string }>;

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
    await redis.del("session:active-user");
    await redis.del("session:expiring-soon");
    manager = createSessionManager<{ userId: string; role: string }>(redis, {
      defaultTtlSeconds: 3600,
      extendOnAccess: true,
      autoExtendThreshold: 0.5,
    });
  });

  describe("set / get", () => {
    it("sets and gets session data", async () => {
      await manager.set("active-user", { userId: "123", role: "admin" });

      const session = await manager.get("active-user");
      expect(session).toEqual({ userId: "123", role: "admin" });
    });

    it("returns null for non-existent session", async () => {
      const session = await manager.get("nonexistent");
      expect(session).toBeNull();
    });
  });

  describe("auto-extend on access", () => {
    it("extends TTL when below threshold", async () => {
      await manager.set("expiring-soon", { userId: "123", role: "user" }, 3600);
      await redis.expire("session:expiring-soon", 100);

      await manager.get("expiring-soon");

      const ttl = await redis.ttl("session:expiring-soon");
      expect(ttl).toBeGreaterThan(3500);
    });

    it("does not extend TTL when above threshold", async () => {
      await manager.set("active-user", { userId: "123", role: "admin" }, 3600);

      const ttlBefore = await redis.ttl("session:active-user");
      await manager.get("active-user");
      const ttlAfter = await redis.ttl("session:active-user");

      expect(Math.abs(ttlBefore - ttlAfter)).toBeLessThan(2);
    });
  });

  describe("delete", () => {
    it("deletes session", async () => {
      await manager.set("active-user", { userId: "123", role: "admin" });
      await manager.delete("active-user");

      const session = await manager.get("active-user");
      expect(session).toBeNull();
    });
  });

  describe("touch", () => {
    it("manually extends session TTL", async () => {
      await manager.set("active-user", { userId: "123", role: "admin" }, 100);

      const extended = await manager.touch("active-user", 7200);
      expect(extended).toBe(true);

      const ttl = await redis.ttl("session:active-user");
      expect(ttl).toBeGreaterThan(7100);
    });

    it("returns false for non-existent session", async () => {
      const result = await manager.touch("nonexistent", 3600);
      expect(result).toBe(false);
    });
  });

  describe("refresh", () => {
    it("updates session data and resets TTL", async () => {
      await manager.set("active-user", { userId: "123", role: "user" });
      await manager.refresh("active-user", { userId: "123", role: "admin" });

      const session = await manager.get("active-user");
      expect(session?.role).toBe("admin");
    });
  });

  describe("disabled auto-extend", () => {
    it("does not extend TTL when extendOnAccess is false", async () => {
      const noExtendManager = createSessionManager<{ userId: string }>(redis, {
        defaultTtlSeconds: 3600,
        extendOnAccess: false,
      });

      await noExtendManager.set("active-user", { userId: "123" }, 100);

      const ttlBefore = await redis.ttl("session:active-user");
      await noExtendManager.get("active-user");
      const ttlAfter = await redis.ttl("session:active-user");

      expect(ttlBefore).toBe(100);
      expect(ttlAfter).toBe(100);
    });
  });
});
