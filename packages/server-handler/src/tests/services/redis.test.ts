import { describe, it, expect, beforeEach } from "bun:test";
import { initRedisService } from "../../services/redis";
import type { RedisConfig } from "../../services/redis";

const createMockLogger = () => ({
  info: () => {},
  error: () => {},
  warn: () => {},
  debug: () => {},
});

describe("Redis Service", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  describe("initRedisService", () => {
    it("skips initialization when not enabled", async () => {
      await initRedisService({ enabled: false }, createMockLogger() as any);
    });

    it("logs warning when no URL is configured", async () => {
      delete process.env.REDIS_URL;
      let warningCalled = false;

      const logger = {
        ...createMockLogger(),
        warn: () => {
          warningCalled = true;
        },
      };

      await initRedisService({ enabled: true }, logger as any);
      expect(warningCalled).toBe(true);
    });
  });

  describe("RedisConfig interface", () => {
    it("accepts valid config", () => {
      const config: RedisConfig = {
        enabled: true,
        url: "redis://localhost:6379",
      };
      expect(config.enabled).toBe(true);
    });

    it("accepts partial config", () => {
      const config: RedisConfig = {
        enabled: false,
      };
      expect(config.url).toBeUndefined();
    });
  });
});
