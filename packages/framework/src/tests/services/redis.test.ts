import { describe, it, expect, beforeEach } from "bun:test";
import { initRedis } from "../../services/redis";
import { RedisConfig } from '../../services/redis';

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
    it("skips initialization when not enabled", () => {
      const result = initRedis();
      expect(result).toBeNull();
    });

    it("initializes with empty URL", () => {
      delete process.env.REDIS_URL;
      const logger = createMockLogger();

      const result = initRedis({ url: process.env.REDIS_URL ?? "", logger: logger as any });
      expect(result).toBeDefined();
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
