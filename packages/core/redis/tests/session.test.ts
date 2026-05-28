import { describe, it, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import {
  initRedis,
  getRedis,
  getSession,
  setSession,
  deleteSession,
  extendSession,
  disconnectRedis,
} from "../src/index";

describe("Session", () => {
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
    await redis.del("session:test-token");
  });

  describe("setSession", () => {
    it("sets session data with TTL", async () => {
      const redis = getRedis();
      const data = { userId: "123", role: "admin" };
      await setSession("test-token", data, 3600);

      const raw = await redis.get("session:test-token");
      expect(raw).toBeTruthy();
      expect(JSON.parse(raw!)).toEqual(data);

      const ttl = await redis.ttl("session:test-token");
      expect(ttl).toBeGreaterThan(3500);
      expect(ttl).toBeLessThanOrEqual(3600);
    });

    it("overwrites existing session", async () => {
      await setSession("test-token", { userId: "1" }, 3600);
      await setSession("test-token", { userId: "2" }, 3600);

      const session = await getSession<{ userId: string }>("test-token");
      expect(session?.userId).toBe("2");
    });
  });

  describe("getSession", () => {
    it("returns null for non-existent session", async () => {
      const result = await getSession("nonexistent");
      expect(result).toBeNull();
    });

    it("returns parsed session data", async () => {
      await setSession("test-token", { userId: "123" }, 3600);
      const result = await getSession<{ userId: string }>("test-token");
      expect(result).toEqual({ userId: "123" });
    });

    it("returns null for invalid JSON", async () => {
      const redis = getRedis();
      await redis.set("session:invalid-json", "not valid json");
      const result = await getSession("invalid-json");
      expect(result).toBeNull();
      await redis.del("session:invalid-json");
    });
  });

  describe("deleteSession", () => {
    it("deletes existing session", async () => {
      await setSession("test-token", { userId: "123" }, 3600);
      await deleteSession("test-token");

      const result = await getSession("test-token");
      expect(result).toBeNull();
    });

    it("does not error on non-existent session", async () => {
      await expect(deleteSession("nonexistent")).resolves.toBeUndefined();
    });
  });

  describe("extendSession", () => {
    it("extends session TTL", async () => {
      const redis = getRedis();
      await setSession("test-token", { userId: "123" }, 10);

      const extended = await extendSession("test-token", 3600);
      expect(extended).toBe(true);

      const ttl = await redis.ttl("session:test-token");
      expect(ttl).toBeGreaterThan(3500);
    });

    it("returns false for non-existent session", async () => {
      const result = await extendSession("nonexistent", 3600);
      expect(result).toBe(false);
    });
  });

  describe("Session lifecycle", () => {
    it("session expires after TTL", async () => {
      await setSession("test-token", { userId: "123" }, 1);

      await new Promise((resolve) => setTimeout(resolve, 1500));

      const result = await getSession("test-token");
      expect(result).toBeNull();
    });
  });
});
