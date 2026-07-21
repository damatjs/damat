import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import {
  initRedis,
  hasRedis,
  disconnectRedis,
  getRedis,
  getRedisClient,
  type RedisConfig,
  type RedisClientConfig,
} from "../../services/redis";

const createMockLogger = () => ({
  info: () => {},
  error: () => {},
  warn: () => {},
  debug: () => {},
});

// initRedis stores a module-level singleton. To keep the suite deterministic
// and avoid leaking ioredis sockets between tests, reset the singleton before
// and after each test. `lazyConnect: true` (the default) means construction
// never opens a real socket, so no live Redis server is required.
async function resetRedisSingleton() {
  if (hasRedis()) {
    await disconnectRedis();
  }
}

beforeEach(async () => {
  await resetRedisSingleton();
});

afterEach(async () => {
  await resetRedisSingleton();
});

describe("Redis Service", () => {
  describe("initRedis", () => {
    it("returns null and does not register a singleton when no config is given", () => {
      const result = initRedis();
      expect(result).toBeNull();
      expect(hasRedis()).toBe(false);
    });

    it("creates a client and registers the singleton when given a config", () => {
      const logger = createMockLogger();
      const result = initRedis({
        url: "redis://localhost:6379",
        lazyConnect: true,
        logger: logger as never,
      });

      expect(result).not.toBeNull();
      expect(hasRedis()).toBe(true);
      // The constructed client exposes the underlying ioredis instance.
      expect(result!.client).toBeDefined();
      expect(result!.isConnected).toBe(false);
    });

    it("accepts an empty URL without opening a connection", () => {
      const logger = createMockLogger();
      const result = initRedis({
        url: "",
        lazyConnect: true,
        logger: logger as never,
      });
      expect(result).not.toBeNull();
      expect(hasRedis()).toBe(true);
    });

    it("replaces the existing singleton when called twice", () => {
      const logger = createMockLogger();
      const first = initRedis({
        url: "redis://localhost:6379",
        lazyConnect: true,
        logger: logger as never,
      });
      const second = initRedis({
        url: "redis://localhost:6380",
        lazyConnect: true,
        logger: logger as never,
      });

      expect(first).not.toBeNull();
      expect(second).not.toBeNull();
      expect(second).not.toBe(first);
      // The newest client is the one returned by the singleton accessor.
      expect(getRedisClient()).toBe(second!);
    });
  });

  describe("singleton accessors", () => {
    it("hasRedis reflects whether a singleton is registered", () => {
      expect(hasRedis()).toBe(false);
      initRedis({ url: "redis://localhost:6379", lazyConnect: true });
      expect(hasRedis()).toBe(true);
    });

    it("getRedis throws when uninitialized", () => {
      expect(hasRedis()).toBe(false);
      expect(() => getRedis()).toThrow();
    });

    it("getRedisClient throws when uninitialized", () => {
      expect(hasRedis()).toBe(false);
      expect(() => getRedisClient()).toThrow();
    });

    it("getRedis returns the underlying ioredis client when initialized", () => {
      const client = initRedis({
        url: "redis://localhost:6379",
        lazyConnect: true,
      });
      expect(getRedis()).toBe(client!.client);
    });
  });

  describe("disconnectRedis", () => {
    it("clears the singleton", async () => {
      initRedis({ url: "redis://localhost:6379", lazyConnect: true });
      expect(hasRedis()).toBe(true);
      await disconnectRedis();
      expect(hasRedis()).toBe(false);
    });

    it("is a no-op when nothing is initialized", async () => {
      expect(hasRedis()).toBe(false);
      await expect(disconnectRedis()).resolves.toBeUndefined();
      expect(hasRedis()).toBe(false);
    });
  });

  describe("RedisConfig / RedisClientConfig typing", () => {
    it("accepts a minimal config", () => {
      const config: RedisConfig = { url: "redis://localhost:6379" };
      expect(config.url).toBe("redis://localhost:6379");
    });

    it("accepts an extended client config", () => {
      const config: RedisClientConfig = {
        url: "redis://localhost:6379",
        maxRetriesPerRequest: 5,
        lazyConnect: true,
        name: "primary",
        debug: true,
      };
      expect(config.name).toBe("primary");
      expect(config.maxRetriesPerRequest).toBe(5);
    });
  });
});
