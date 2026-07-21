import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test";
import { tmpdir } from "node:os";

// ---------------------------------------------------------------------------
// OS-boundary fakes.
//
// `initializeServices` boots the real database + redis services, which bottom
// out at the `pg` Pool and the `ioredis` client. We mock ONLY those OS/network
// boundaries (re-exported via `@damatjs/deps/*`) so the real framework wiring
// runs with no live Postgres/Redis. We do NOT mock the shared internal modules
// (`@damatjs/orm-connector`, `@damatjs/redis`, `./database`, `./redis`), so the
// dedicated database.test.ts / redis.test.ts suites keep working unchanged.
// ---------------------------------------------------------------------------

// Toggles let each test pick the pg/redis behaviour it needs.
let redisPingThrows = false; // ioredis.ping() rejects

class FakePoolClient {
  release() {}
  async query() {
    return { rows: [{ "?column?": 1 }] };
  }
}

class FakePgPool {
  // pg pool stats read by orm-connector's fetchPoolStats.
  totalCount = 1;
  idleCount = 1;
  waitingCount = 0;
  on() {
    return this;
  }
  async connect() {
    return new FakePoolClient();
  }
  async end() {}
}

class FakeRedis {
  on() {
    return this;
  }
  async connect() {}
  async ping() {
    if (redisPingThrows) throw new Error("redis ping failed");
    return "PONG";
  }
  async quit() {}
}

mock.module("@damatjs/deps/pg", () => ({ Pool: FakePgPool }));
mock.module("@damatjs/deps/ioredis", () => ({
  Redis: FakeRedis,
  default: FakeRedis,
}));

const { initializeServices } = await import("../../services/index");
const { closeDatabase, getConnectionManager } =
  await import("../../services/database");
const { disconnectRedis, hasRedis } = await import("../../services/redis");
const { clearModules } = await import("../../services/moduleService");

import type { AppConfig } from "../../config";

const SCRATCH = tmpdir();

function config(project: Partial<AppConfig["projectConfig"]>): AppConfig {
  return {
    projectConfig: {
      http: { port: 3000, host: "localhost" },
      nodeEnv: "test",
      ...project,
    },
  };
}

beforeEach(() => {
  redisPingThrows = false;
  clearModules();
});

afterEach(async () => {
  await closeDatabase();
  if (hasRedis()) await disconnectRedis();
  clearModules();
});

describe("initializeServices (database configured)", () => {
  it("initialises the database, registers a shutdown handler, and reports a healthy db check", async () => {
    const instances = await initializeServices(
      config({ databaseUrl: "postgres://u:p@localhost:5432/d" }),
      SCRATCH,
    );

    expect(instances.shutdownHandlers.map((h) => h.name)).toEqual([
      "database",
      "logger",
    ]);

    const health = await instances.healthChecks!.database!();
    expect(health.status).toBe("healthy");
    expect(typeof health.latency).toBe("number");

    // The database shutdown handler runs cleanly.
    await instances.shutdownHandlers
      .find((h) => h.name === "database")!
      .handler();
  });

  it("reports an unhealthy db check when the health probe throws", async () => {
    const instances = await initializeServices(
      config({ databaseUrl: "postgres://u:p@localhost:5432/d" }),
      SCRATCH,
    );

    // Force the active connection manager's health probe to reject. Patching the
    // returned singleton instance (rather than a module mock) keeps this robust
    // no matter which ConnectionManager implementation is in effect.
    const probe = new Error("health probe failed");
    getConnectionManager()!.healthCheck = async () => {
      throw probe;
    };
    const health = await instances.healthChecks!.database!();
    expect(health.status).toBe("unhealthy");
    expect(health.data).toBe(probe);
  });

  it("uses an explicit services.database config when provided", async () => {
    const cfg = config({ databaseUrl: "postgres://u:p@localhost:5432/d" });
    cfg.services = {
      database: { connectionString: "postgres://explicit" } as never,
    };

    const instances = await initializeServices(cfg, SCRATCH);
    const health = await instances.healthChecks!.database!();
    expect(health.status).toBe("healthy");
  });
});

describe("initializeServices (redis configured)", () => {
  it("initialises redis, registers a shutdown handler, and reports a healthy redis check", async () => {
    const instances = await initializeServices(
      config({ redisUrl: "redis://localhost:6379" }),
      SCRATCH,
    );

    expect(instances.shutdownHandlers.map((h) => h.name)).toContain("redis");

    const health = await instances.healthChecks!.redis!();
    expect(health.status).toBe("healthy");

    await instances.shutdownHandlers.find((h) => h.name === "redis")!.handler();
  });

  it("honours an explicit services.redis url override", async () => {
    const cfg = config({ redisUrl: "redis://localhost:6379" });
    cfg.services = { redis: { url: "redis://override:6379" } };

    const instances = await initializeServices(cfg, SCRATCH);
    const health = await instances.healthChecks!.redis!();
    expect(health.status).toBe("healthy");
  });

  it("reports an unhealthy redis check when ping rejects", async () => {
    const instances = await initializeServices(
      config({ redisUrl: "redis://localhost:6379" }),
      SCRATCH,
    );

    redisPingThrows = true;
    const health = await instances.healthChecks!.redis!();
    expect(health.status).toBe("unhealthy");
    expect(health.data).toBeInstanceOf(Error);
  });
});

describe("initializeServices (database + redis together)", () => {
  it("registers database, redis, and logger shutdown handlers in order", async () => {
    const instances = await initializeServices(
      config({
        databaseUrl: "postgres://u:p@localhost:5432/d",
        redisUrl: "redis://localhost:6379",
      }),
      SCRATCH,
    );

    expect(instances.shutdownHandlers.map((h) => h.name)).toEqual([
      "database",
      "redis",
      "logger",
    ]);
  });
});
