import { describe, it, expect, beforeEach } from "bun:test";
import { SessionManager, createSessionManager } from "../src/index";
import { createFakeRedis, type FakeRedis } from "./helpers/fakeRedis";

type SessionData = { userId: string; role: string };

describe("SessionManager", () => {
  let redis: FakeRedis;
  let manager: SessionManager<SessionData>;

  beforeEach(() => {
    redis = createFakeRedis();
    manager = createSessionManager<SessionData>(
      {
        defaultTtlSeconds: 3600,
        extendOnAccess: true,
        extendThreshold: 0.5,
      },
      redis,
    );
  });

  describe("construction", () => {
    it("createSessionManager returns a SessionManager instance", () => {
      expect(manager).toBeInstanceOf(SessionManager);
    });
  });

  describe("set / get", () => {
    it("sets and gets session data", async () => {
      await manager.set("active-user", { userId: "123", role: "admin" });

      const session = await manager.get("active-user");
      expect(session).toEqual({ userId: "123", role: "admin" });
    });

    it("returns null for non-existent session", async () => {
      expect(await manager.get("nonexistent")).toBeNull();
    });

    it("uses defaultTtlSeconds when no ttl is given to set", async () => {
      await manager.set("active-user", { userId: "1", role: "user" });
      const ttl = await redis.ttl("session:active-user");
      expect(ttl).toBeGreaterThan(3590);
      expect(ttl).toBeLessThanOrEqual(3600);
    });

    it("honors an explicit ttl on set", async () => {
      await manager.set("active-user", { userId: "1", role: "user" }, 120);
      const ttl = await redis.ttl("session:active-user");
      expect(ttl).toBeGreaterThan(110);
      expect(ttl).toBeLessThanOrEqual(120);
    });
  });

  describe("auto-extend on access", () => {
    it("extends TTL when remaining TTL is below threshold", async () => {
      await manager.set("expiring-soon", { userId: "123", role: "user" }, 3600);
      // Force TTL below minTtl = floor(3600 * 0.5) = 1800.
      await redis.expire("session:expiring-soon", 100);

      await manager.get("expiring-soon");

      const ttl = await redis.ttl("session:expiring-soon");
      expect(ttl).toBeGreaterThan(3590);
    });

    it("does not extend TTL when above threshold", async () => {
      await manager.set("active-user", { userId: "123", role: "admin" }, 3600);

      const ttlBefore = await redis.ttl("session:active-user");
      await manager.get("active-user");
      const ttlAfter = await redis.ttl("session:active-user");

      expect(Math.abs(ttlBefore - ttlAfter)).toBeLessThan(2);
    });

    it("does not extend a missing session on get", async () => {
      const session = await manager.get("missing");
      expect(session).toBeNull();
      // Nothing should have been created.
      expect(await redis.ttl("session:missing")).toBe(-2);
    });

    it("re-extends the TTL when accessed after the clock passes the threshold", async () => {
      await manager.set("sliding", { userId: "123", role: "user" }, 3600);

      // Advance 2000s: remaining TTL ~1600 < minTtl = floor(3600 * 0.5) = 1800.
      redis.advanceTime(2_000_000);
      expect(await redis.ttl("session:sliding")).toBeLessThan(1800);

      const session = await manager.get("sliding");
      expect(session).toEqual({ userId: "123", role: "user" });

      // The access re-armed the TTL back to the full default.
      const ttl = await redis.ttl("session:sliding");
      expect(ttl).toBeGreaterThan(3590);
      expect(ttl).toBeLessThanOrEqual(3600);
    });

    it("sliding TTL keeps an accessed session alive past its original TTL", async () => {
      await manager.set("sliding", { userId: "123", role: "user" }, 3600);

      // Each access below the threshold slides the expiry window forward.
      redis.advanceTime(2_000_000); // t = 2000s
      await manager.get("sliding");
      redis.advanceTime(2_000_000); // t = 4000s, past the original 3600s TTL

      expect(await manager.get("sliding")).toEqual({
        userId: "123",
        role: "user",
      });
    });

    it("expires without access even when extendOnAccess is enabled", async () => {
      await manager.set("idle", { userId: "123", role: "user" }, 3600);

      // No access happens, so nothing slides the window.
      redis.advanceTime(3_601_000);

      expect(await manager.get("idle")).toBeNull();
      // The key is truly gone, not extended by the failed access.
      expect(await redis.ttl("session:idle")).toBe(-2);
    });
  });

  describe("delete", () => {
    it("deletes a session", async () => {
      await manager.set("active-user", { userId: "123", role: "admin" });
      await manager.delete("active-user");
      expect(await manager.get("active-user")).toBeNull();
    });
  });

  describe("touch", () => {
    it("manually extends session TTL and returns true", async () => {
      await manager.set("active-user", { userId: "123", role: "admin" }, 100);

      const extended = await manager.touch("active-user", 7200);
      expect(extended).toBe(true);

      const ttl = await redis.ttl("session:active-user");
      expect(ttl).toBeGreaterThan(7100);
    });

    it("falls back to defaultTtlSeconds when no ttl is given", async () => {
      await manager.set("active-user", { userId: "1", role: "user" }, 100);
      const extended = await manager.touch("active-user");
      expect(extended).toBe(true);
      const ttl = await redis.ttl("session:active-user");
      expect(ttl).toBeGreaterThan(3590);
    });

    it("returns false for non-existent session", async () => {
      expect(await manager.touch("nonexistent", 3600)).toBe(false);
    });
  });

  describe("refresh", () => {
    it("updates session data and resets TTL", async () => {
      await manager.set("active-user", { userId: "123", role: "user" });
      await manager.refresh("active-user", { userId: "123", role: "admin" });

      const session = await manager.get("active-user");
      expect(session?.role).toBe("admin");

      const ttl = await redis.ttl("session:active-user");
      expect(ttl).toBeGreaterThan(3590);
    });
  });

  describe("disabled auto-extend", () => {
    it("does not extend TTL when extendOnAccess is false", async () => {
      const noExtendManager = createSessionManager<SessionData>(
        {
          defaultTtlSeconds: 3600,
          extendOnAccess: false,
        },
        redis,
      );

      await noExtendManager.set(
        "active-user",
        { userId: "123", role: "user" },
        100,
      );

      const ttlBefore = await redis.ttl("session:active-user");
      await noExtendManager.get("active-user");
      const ttlAfter = await redis.ttl("session:active-user");

      // TTL should be effectively unchanged (still ~100s).
      expect(ttlBefore).toBeGreaterThan(98);
      expect(ttlBefore).toBeLessThanOrEqual(100);
      expect(Math.abs(ttlBefore - ttlAfter)).toBeLessThan(2);
    });
  });
});
