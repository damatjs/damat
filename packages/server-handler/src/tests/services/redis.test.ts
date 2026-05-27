import { describe, it, expect, beforeEach } from "bun:test";
import { initRedis } from "../../services/redis";
import { RedisConfig } from '@damatjs/utils';

const createMockLogger = () => ({
  info: () => { },
  error: () => { },
  warn: () => { },
  debug: () => { },
});

describe("Redis Service", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  describe("initRedis", () => {
    it("skips initialization when not enabled", async () => {
      await initRedis(undefined, createMockLogger() as any);
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

      await initRedis({ url: process.env.REDIS_URL ?? "" }, logger as any);
      expect(warningCalled).toBe(true);
    });
  });

  describe("RedisConfig interface", () => {
    it("accepts valid config", () => {
      const config: RedisConfig = {
        url: "redis://localhost:6379",
      };
      expect(config.url).toBe("redis://localhost:6379");
    });

    it("accepts partial config", () => {
      const config: RedisConfig = {
        url: "",
      };
      expect(config.url).toBe("");
    });
  });
});
