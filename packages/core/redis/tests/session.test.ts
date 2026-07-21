import { describe, it, expect, beforeEach } from "bun:test";
import {
  getSession,
  setSession,
  deleteSession,
  extendSession,
} from "../src/index";
import { createFakeRedis, type FakeRedis } from "./helpers/fakeRedis";

describe("Session", () => {
  let redis: FakeRedis;

  beforeEach(() => {
    redis = createFakeRedis();
  });

  describe("setSession", () => {
    it("sets session data with TTL under the session prefix", async () => {
      const data = { userId: "123", role: "admin" };
      await setSession("test-token", data, 3600, redis);

      const raw = await redis.get("session:test-token");
      expect(raw).toBeTruthy();
      expect(JSON.parse(raw!)).toEqual(data);

      const ttl = await redis.ttl("session:test-token");
      expect(ttl).toBeGreaterThan(3590);
      expect(ttl).toBeLessThanOrEqual(3600);
    });

    it("overwrites an existing session", async () => {
      await setSession("test-token", { userId: "1" }, 3600, redis);
      await setSession("test-token", { userId: "2" }, 3600, redis);

      const session = await getSession<{ userId: string }>("test-token", redis);
      expect(session?.userId).toBe("2");
    });
  });

  describe("getSession", () => {
    it("returns null for non-existent session", async () => {
      expect(await getSession("nonexistent", redis)).toBeNull();
    });

    it("returns parsed session data", async () => {
      await setSession("test-token", { userId: "123" }, 3600, redis);
      const result = await getSession<{ userId: string }>("test-token", redis);
      expect(result).toEqual({ userId: "123" });
    });

    it("returns null for invalid JSON instead of throwing", async () => {
      await redis.set("session:invalid-json", "not valid json");
      expect(await getSession("invalid-json", redis)).toBeNull();
    });
  });

  describe("deleteSession", () => {
    it("deletes an existing session", async () => {
      await setSession("test-token", { userId: "123" }, 3600, redis);
      await deleteSession("test-token", redis);
      expect(await getSession("test-token", redis)).toBeNull();
    });

    it("does not error on non-existent session", async () => {
      await expect(
        deleteSession("nonexistent", redis),
      ).resolves.toBeUndefined();
    });
  });

  describe("extendSession", () => {
    it("extends session TTL and returns true", async () => {
      await setSession("test-token", { userId: "123" }, 10, redis);

      const extended = await extendSession("test-token", 3600, redis);
      expect(extended).toBe(true);

      const ttl = await redis.ttl("session:test-token");
      expect(ttl).toBeGreaterThan(3590);
    });

    it("returns false for non-existent session", async () => {
      expect(await extendSession("nonexistent", 3600, redis)).toBe(false);
    });
  });

  describe("Session lifecycle", () => {
    it("session expires after its TTL elapses", async () => {
      await setSession("test-token", { userId: "123" }, 1, redis);
      expect(await getSession("test-token", redis)).toEqual({ userId: "123" });

      redis.advanceTime(1500);

      expect(await getSession("test-token", redis)).toBeNull();
    });

    it("extendSession keeps the session alive past the original TTL", async () => {
      await setSession("test-token", { userId: "123" }, 2, redis);
      await extendSession("test-token", 3600, redis);

      redis.advanceTime(3000);

      expect(await getSession("test-token", redis)).toEqual({ userId: "123" });
    });
  });
});
