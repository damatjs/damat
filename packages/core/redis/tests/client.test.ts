import { describe, it, expect, afterEach, beforeEach, spyOn } from "bun:test";
import { Redis } from "@damatjs/deps/ioredis";
import {
  createRedis,
  disconnect,
  initRedis,
  getRedis,
  getRedisClient,
  hasRedis,
  disconnectRedis,
  RedisClient,
  RedisNotInitializedError,
  RedisConnectionError,
  createRetryStrategy,
} from "../src/index";

const TEST_URL = "redis://localhost:6379";
// Only the connect/ping paths need a live server; gate those behind REDIS_URL.
const hasServer = !!process.env.REDIS_URL;

describe("Redis Client (offline)", () => {
  // Calling quit() on a never-connected lazy ioredis client triggers a real
  // (background) connection attempt and a deferred "Connection is closed"
  // rejection. We are testing our own teardown logic, not ioredis network
  // teardown, so stub quit() to resolve cleanly and keep tests deterministic.
  let quitSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    quitSpy = spyOn(Redis.prototype, "quit").mockResolvedValue("OK");
  });

  afterEach(async () => {
    // Ensure the global singleton is reset between tests for isolation.
    if (hasRedis()) {
      await disconnectRedis();
    }
    quitSpy.mockRestore();
  });

  describe("createRedis", () => {
    it("creates a lazy client that does not connect immediately", () => {
      const redis = createRedis({ url: TEST_URL });
      // lazyConnect defaults to true -> status is "wait" until first command.
      expect(redis.status).toBe("wait");
      expect(typeof redis.ping).toBe("function");
    });

    it("respects an explicit lazyConnect: true", () => {
      const redis = createRedis({ url: TEST_URL, lazyConnect: true });
      expect(redis.status).toBe("wait");
    });

    it("accepts custom retry options without connecting", () => {
      const redis = createRedis({ url: TEST_URL, maxRetriesPerRequest: 5 });
      expect(redis.options.maxRetriesPerRequest).toBe(5);
      expect(redis.status).toBe("wait");
    });

    it("merges extra options", () => {
      const redis = createRedis({
        url: TEST_URL,
        options: { connectionName: "custom-conn" },
      });
      expect(redis.options.connectionName).toBe("custom-conn");
    });
  });

  describe("disconnect", () => {
    it("calls quit on the client and resolves without throwing", async () => {
      const redis = createRedis({ url: TEST_URL });
      await expect(disconnect(redis)).resolves.toBeUndefined();
      expect(quitSpy).toHaveBeenCalled();
    });
  });

  describe("createRetryStrategy", () => {
    it("scales linearly then caps at 2000ms", () => {
      expect(createRetryStrategy(0)).toBe(0);
      expect(createRetryStrategy(1)).toBe(50);
      expect(createRetryStrategy(10)).toBe(500);
      // 50 * 50 = 2500 -> capped at 2000.
      expect(createRetryStrategy(50)).toBe(2000);
      expect(createRetryStrategy(1000)).toBe(2000);
    });
  });

  describe("RedisClient class", () => {
    it("constructs with a lazy connection and exposes the client", () => {
      const client = new RedisClient({ url: TEST_URL, name: "test" });
      expect(client.client.status).toBe("wait");
      expect(client.isConnected).toBe(false);
    });

    it("ping returns true when the underlying client replies PONG", async () => {
      const client = new RedisClient({ url: TEST_URL });
      const spy = spyOn(client.client, "ping").mockResolvedValue("PONG");
      expect(await client.ping()).toBe(true);
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    it("ping returns false when the underlying client rejects", async () => {
      // ping() catches errors and returns false rather than throwing.
      const client = new RedisClient({ url: TEST_URL });
      const spy = spyOn(client.client, "ping").mockRejectedValue(
        new Error("Connection is closed."),
      );
      expect(await client.ping()).toBe(false);
      spy.mockRestore();
    });
  });

  describe("singleton lifecycle (offline)", () => {
    it("initRedis returns null when no config is provided", () => {
      expect(initRedis()).toBeNull();
      expect(hasRedis()).toBe(false);
    });

    it("getRedis throws RedisNotInitializedError before init", () => {
      expect(hasRedis()).toBe(false);
      expect(() => getRedis()).toThrow(RedisNotInitializedError);
    });

    it("getRedisClient throws RedisNotInitializedError before init", () => {
      expect(() => getRedisClient()).toThrow(RedisNotInitializedError);
    });

    it("initRedis initializes the global client (lazy, no connection)", async () => {
      expect(hasRedis()).toBe(false);

      const client = initRedis({ url: TEST_URL });
      expect(client).not.toBeNull();
      expect(client).toBeInstanceOf(RedisClient);
      expect(hasRedis()).toBe(true);

      const redis = getRedis();
      expect(redis.status).toBe("wait");
      expect(getRedisClient().client).toBe(redis);

      await disconnectRedis();
      expect(hasRedis()).toBe(false);
    });

    it("getRedis throws again after disconnectRedis", async () => {
      initRedis({ url: TEST_URL });
      expect(hasRedis()).toBe(true);
      await disconnectRedis();
      expect(() => getRedis()).toThrow(RedisNotInitializedError);
    });

    it("disconnectRedis is a no-op when nothing is initialized", async () => {
      expect(hasRedis()).toBe(false);
      await expect(disconnectRedis()).resolves.toBeUndefined();
    });

    it("re-initializing replaces the previous global client", async () => {
      const first = initRedis({ url: TEST_URL, name: "first" });
      const second = initRedis({ url: TEST_URL, name: "second" });
      expect(first).not.toBe(second);
      expect(getRedisClient()).toBe(second!);
      await disconnectRedis();
    });
  });

  describe("error classes", () => {
    it("RedisNotInitializedError carries a default message and name", () => {
      const err = new RedisNotInitializedError();
      expect(err).toBeInstanceOf(Error);
      expect(err.name).toBe("RedisNotInitializedError");
      expect(err.message).toContain("Redis not initialized");
    });

    it("RedisNotInitializedError accepts a custom message", () => {
      const err = new RedisNotInitializedError("custom");
      expect(err.message).toBe("custom");
    });

    it("RedisConnectionError stores the underlying cause", () => {
      const cause = new Error("boom");
      const err = new RedisConnectionError("failed", cause);
      expect(err).toBeInstanceOf(Error);
      expect(err.name).toBe("RedisConnectionError");
      expect(err.message).toBe("failed");
      expect(err.cause).toBe(cause);
    });
  });
});

// These exercise the real connect/ping path and require a reachable server.
describe.skipIf(!hasServer)("Redis Client (live server)", () => {
  afterEach(async () => {
    if (hasRedis()) await disconnectRedis();
  });

  it("createRedis connects and pings", async () => {
    const redis = createRedis({ url: process.env.REDIS_URL! });
    await redis.connect();
    expect(await redis.ping()).toBe("PONG");
    await disconnect(redis);
  });

  it("initRedis + getRedis pings via the singleton", async () => {
    initRedis({ url: process.env.REDIS_URL! });
    expect(hasRedis()).toBe(true);
    const redis = getRedis();
    await redis.connect();
    expect(await redis.ping()).toBe("PONG");
    await disconnectRedis();
    expect(hasRedis()).toBe(false);
  });
});
