import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { Hono } from "@damatjs/deps/hono";
import type { HttpRateLimitConfig } from "../../config";
import {
  initRedis,
  disconnectRedis,
  getRedisClient,
  hasRedis,
} from "../../services/redis";
import {
  setGlobalLoggerInstance,
  clearGlobalLogger,
} from "../../services/logger";
import { createRateLimitMiddleware } from "../../middleware/rateLimit";

// ---------------------------------------------------------------------------
// We deliberately avoid mock.module here: bun's mock.module is process-global
// and would corrupt the real redis service for other test files (e.g.
// redis.test.ts). Instead we use the REAL redis service (so the real
// hasRedis/getRedis/checkRateLimit run) and monkey-patch the underlying
// ioredis client's pipeline()/zrange() to return controllable fakes. No live
// Redis is needed: lazyConnect means construction never opens a socket and we
// never await a real network call.
//
// The logger is swapped via the real setGlobalLoggerInstance API (not
// mock.module) and restored after each test.
// ---------------------------------------------------------------------------

const logCalls: { level: string; msg: string }[] = [];

const recordingLogger = {
  warn: (msg: string) => logCalls.push({ level: "warn", msg }),
  error: (msg: string) => logCalls.push({ level: "error", msg }),
  info: (msg: string) => logCalls.push({ level: "info", msg }),
  debug: (msg: string) => logCalls.push({ level: "debug", msg }),
  child: () => recordingLogger,
  request: () => {},
  close: () => {},
};

// Controls what the patched pipeline.exec() reports as the current count.
const redisState = {
  currentCount: 0,
  oldestTimestamp: Date.now(),
};

function patchRedisClient() {
  const ioredis = getRedisClient().client as any;
  ioredis.pipeline = () => {
    const ops = {
      zremrangebyscore: () => ops,
      zcard: () => ops,
      zadd: () => ops,
      pexpire: () => ops,
      // checkRateLimit reads results[1][1] as the current count.
      exec: async () => [
        [null, 0],
        [null, redisState.currentCount],
        [null, 1],
        [null, 1],
      ],
    };
    return ops;
  };
  ioredis.zrange = async () => ["member", String(redisState.oldestTimestamp)];
}

const rl = (
  requests: number,
  window = "1m",
  extra: Partial<HttpRateLimitConfig> = {},
): HttpRateLimitConfig => ({ requests, window, ...extra });

beforeEach(() => {
  logCalls.length = 0;
  redisState.currentCount = 0;
  redisState.oldestTimestamp = Date.now();
  setGlobalLoggerInstance(recordingLogger as never);
  initRedis({ url: "redis://localhost:6379", lazyConnect: true } as never);
  patchRedisClient();
});

afterEach(async () => {
  if (hasRedis()) await disconnectRedis();
  clearGlobalLogger();
});

describe("createRateLimitMiddleware", () => {
  describe("Redis unavailable", () => {
    it("bypasses (calls next) and logs a warning when Redis is not available", async () => {
      await disconnectRedis(); // remove the singleton so hasRedis() is false
      const app = new Hono();
      app.use("*", createRateLimitMiddleware(rl(10)));
      app.get("/", (c) => c.text("ok"));

      const res = await app.request("/");
      expect(res.status).toBe(200);
      expect(await res.text()).toBe("ok");
      expect(logCalls.some((l) => l.level === "warn" && /Redis not available/.test(l.msg))).toBe(true);
    });
  });

  describe("allowed requests", () => {
    it("sets X-RateLimit headers and proceeds to the handler", async () => {
      redisState.currentCount = 2; // remaining = 10 - 2 - 1 = 7
      const app = new Hono();
      app.use("*", createRateLimitMiddleware(rl(10)));
      app.get("/", (c) => c.text("handler"));

      const res = await app.request("/");
      expect(res.status).toBe(200);
      expect(await res.text()).toBe("handler");
      expect(res.headers.get("X-RateLimit-Limit")).toBe("10");
      expect(res.headers.get("X-RateLimit-Remaining")).toBe("7");
      expect(res.headers.get("X-RateLimit-Reset")).toBeTruthy();
    });
  });

  describe("rate limit exceeded", () => {
    it("returns 429 with error body, Retry-After and X-RateLimit headers", async () => {
      // currentCount >= maxRequests -> not allowed
      redisState.currentCount = 10;
      // oldest timestamp 30s in the past of a 1m window -> retryAfter ~30s
      const now = Date.now();
      redisState.oldestTimestamp = now - 30000;

      const app = new Hono();
      app.use("*", createRateLimitMiddleware(rl(10, "1m")));
      let reached = false;
      app.get("/", (c) => {
        reached = true;
        return c.text("should not reach");
      });

      const res = await app.request("/");
      expect(res.status).toBe(429);
      expect(reached).toBe(false);

      const body = (await res.json()) as any;
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("RATE_LIMIT_EXCEEDED");
      expect(body.error.details.limit).toBe(10);
      expect(body.error.details.window).toBe("1m");
      expect(typeof body.error.details.retryAfter).toBe("number");

      expect(res.headers.get("X-RateLimit-Limit")).toBe("10");
      expect(res.headers.get("X-RateLimit-Remaining")).toBe("0");
      expect(res.headers.get("Retry-After")).toBeTruthy();
    });
  });

  describe("checkRateLimit throwing", () => {
    it("catches the error, logs it, and bypasses (calls next)", async () => {
      // Make the pipeline blow up to exercise the catch path.
      const ioredis = getRedisClient().client as any;
      ioredis.pipeline = () => {
        throw new Error("redis pipeline failed");
      };

      const app = new Hono();
      app.use("*", createRateLimitMiddleware(rl(10)));
      app.get("/", (c) => c.text("reached"));

      const res = await app.request("/");
      expect(res.status).toBe(200);
      expect(await res.text()).toBe("reached");
      expect(logCalls.some((l) => l.level === "error" && /Rate limit check failed/.test(l.msg))).toBe(true);
    });
  });

  describe("identifier precedence (apiKey > userId > ip)", () => {
    // The identifier is embedded in the rate-limit key passed to checkRateLimit.
    // We capture it by patching zadd's key indirectly: instead, observe via a
    // wrapping of checkRateLimit's key. Simplest: patch pipeline to record the
    // key passed to zcard.
    function captureKey(): { current: string } {
      const captured = { current: "" };
      const ioredis = getRedisClient().client as any;
      ioredis.pipeline = () => {
        const ops: any = {
          zremrangebyscore: () => ops,
          zcard: (key: string) => {
            captured.current = key;
            return ops;
          },
          zadd: () => ops,
          pexpire: () => ops,
          exec: async () => [
            [null, 0],
            [null, redisState.currentCount],
            [null, 1],
            [null, 1],
          ],
        };
        return ops;
      };
      return captured;
    }

    it("uses the apiKey identifier when an x-api-key header is present (wins over userId)", async () => {
      const captured = captureKey();
      const app = new Hono();
      app.use("*", async (c, next) => {
        c.set("userId", "user-123");
        await next();
      });
      app.use("*", createRateLimitMiddleware(rl(10)));
      app.get("/foo", (c) => c.text("ok"));

      await app.request("/foo", {
        headers: { "x-api-key": "abc", "x-forwarded-for": "1.2.3.4" },
      });

      // RATE_LIMIT_PREFIX + "ratelimit:apikey:abc:/foo"
      expect(captured.current).toContain("ratelimit:apikey:abc:/foo");
    });

    it("uses the userId identifier when no apiKey but userId is set", async () => {
      const captured = captureKey();
      const app = new Hono();
      app.use("*", async (c, next) => {
        c.set("userId", "user-123");
        await next();
      });
      app.use("*", createRateLimitMiddleware(rl(10)));
      app.get("/bar", (c) => c.text("ok"));

      await app.request("/bar", { headers: { "x-forwarded-for": "1.2.3.4" } });

      expect(captured.current).toContain("ratelimit:user:user-123:/bar");
    });

    it("falls back to the first x-forwarded-for IP when no apiKey or userId", async () => {
      const captured = captureKey();
      const app = new Hono();
      app.use("*", createRateLimitMiddleware(rl(10)));
      app.get("/baz", (c) => c.text("ok"));

      await app.request("/baz", { headers: { "x-forwarded-for": " 5.6.7.8 , 9.9.9.9" } });

      expect(captured.current).toContain("ratelimit:ip:5.6.7.8:/baz");
    });

    it("falls back to 'unknown' IP when no identifier and no x-forwarded-for", async () => {
      const captured = captureKey();
      const app = new Hono();
      app.use("*", createRateLimitMiddleware(rl(10)));
      app.get("/q", (c) => c.text("ok"));

      await app.request("/q");

      expect(captured.current).toContain("ratelimit:ip:unknown:/q");
    });
  });

  describe("tier lookups", () => {
    it("applies the user tier config when getUserTier returns one", async () => {
      const globalConfig = rl(100, "1h", {
        getUserTier: async () => rl(3, "10s"),
      });
      const app = new Hono();
      app.use("*", async (c, next) => {
        c.set("userId", "u1");
        await next();
      });
      app.use("*", createRateLimitMiddleware(rl(10), globalConfig));
      app.get("/", (c) => c.text("ok"));

      const res = await app.request("/");
      // tier config requests = 3 reflected in the limit header
      expect(res.headers.get("X-RateLimit-Limit")).toBe("3");
    });

    it("apiKey tier overrides user tier (apiKey applied last)", async () => {
      const globalConfig = rl(100, "1h", {
        getUserTier: async () => rl(3, "10s"),
        getApiKeyTier: async () => rl(50, "1m"),
      });
      const app = new Hono();
      app.use("*", async (c, next) => {
        c.set("userId", "u1");
        await next();
      });
      app.use("*", createRateLimitMiddleware(rl(10), globalConfig));
      app.get("/", (c) => c.text("ok"));

      const res = await app.request("/", { headers: { "x-api-key": "k1" } });
      expect(res.headers.get("X-RateLimit-Limit")).toBe("50");
    });

    it("catches & logs when getUserTier throws, keeping the base config", async () => {
      const globalConfig = rl(100, "1h", {
        getUserTier: async () => {
          throw new Error("tier db down");
        },
      });
      const app = new Hono();
      app.use("*", async (c, next) => {
        c.set("userId", "u1");
        await next();
      });
      app.use("*", createRateLimitMiddleware(rl(10), globalConfig));
      app.get("/", (c) => c.text("ok"));

      const res = await app.request("/");
      expect(res.status).toBe(200);
      expect(res.headers.get("X-RateLimit-Limit")).toBe("10");
      expect(logCalls.some((l) => l.level === "error" && /user tier/.test(l.msg))).toBe(true);
    });

    it("catches & logs when getApiKeyTier throws, keeping the base config", async () => {
      const globalConfig = rl(100, "1h", {
        getApiKeyTier: async () => {
          throw new Error("apikey tier db down");
        },
      });
      const app = new Hono();
      app.use("*", createRateLimitMiddleware(rl(10), globalConfig));
      app.get("/", (c) => c.text("ok"));

      const res = await app.request("/", { headers: { "x-api-key": "k1" } });
      expect(res.status).toBe(200);
      expect(res.headers.get("X-RateLimit-Limit")).toBe("10");
      expect(logCalls.some((l) => l.level === "error" && /API key tier/.test(l.msg))).toBe(true);
    });

    it("ignores a null tier result and keeps the base config", async () => {
      const globalConfig = rl(100, "1h", {
        getUserTier: async () => null,
      });
      const app = new Hono();
      app.use("*", async (c, next) => {
        c.set("userId", "u1");
        await next();
      });
      app.use("*", createRateLimitMiddleware(rl(10), globalConfig));
      app.get("/", (c) => c.text("ok"));

      const res = await app.request("/");
      expect(res.headers.get("X-RateLimit-Limit")).toBe("10");
    });
  });
});
