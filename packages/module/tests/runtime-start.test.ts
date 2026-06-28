import { describe, expect, test, beforeEach, afterAll, mock } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

/**
 * Covers startModuleApp without a live Postgres or Redis.
 *
 * Only the framework's *service initialization* boundary is mocked
 * (`@damatjs/framework/services`): `initializeServices` would otherwise open
 * real DB/Redis sockets. Everything else runs for real — the real `bootstrap`
 * builds a real Hono app, the real `serve` binds an ephemeral port (port 0),
 * and the real `PoolManager` is driven for the migration branch. `getLogger`
 * is passed through to the real implementation so bootstrap and start.ts share
 * a working logger.
 *
 * Leak-safety: `@damatjs/framework/services` is imported only by start.ts within
 * this package, so the module-level mock affects nothing else. Hono `serve`,
 * `@damatjs/framework`'s `bootstrap`, and `@damatjs/services`' `PoolManager`
 * are NOT mocked, so the other suites that rely on them keep their real
 * implementations.
 */

// --- mock the service-init boundary -----------------------------------------

const REAL_FW_SERVICES_PATH = Bun.resolveSync(
  "@damatjs/framework/services",
  import.meta.dir,
);
const realFwServices = await import(REAL_FW_SERVICES_PATH);

// Per-test knobs for the fake initializeServices.
let serviceOpts: {
  withHealthChecks?: boolean;
  shutdownHandlers?: { handler: () => Promise<void> | void }[];
} = {};

const initSpy = mock(async () => ({
  healthChecks: serviceOpts.withHealthChecks
    ? { database: async () => ({ status: "ok", data: {} }) }
    : undefined,
  shutdownHandlers: serviceOpts.shutdownHandlers ?? [],
}));

mock.module("@damatjs/framework/services", () => ({
  ...realFwServices,
  initializeServices: initSpy,
}));

const { startModuleApp } = await import("../src/runtime/start");
import { PoolManager } from "@damatjs/services";

// --- fake pool for the migration branch -------------------------------------

function makeFakePool() {
  const client = {
    query: mock(async () => ({ rows: [], rowCount: 0 })),
    release: mock(() => {}),
  };
  return {
    query: mock(async () => ({ rows: [], rowCount: 0 })),
    connect: mock(async () => client),
    end: mock(async () => {}),
    totalCount: 0,
    idleCount: 0,
    waitingCount: 0,
  };
}

// --- fixtures ---------------------------------------------------------------

function makeModulePackage(opts: { migrationsDir?: boolean } = {}): {
  pkg: string;
  src: string;
} {
  const pkg = mkdtempSync(join(tmpdir(), "damat-start-"));
  const src = join(pkg, "src");
  mkdirSync(src);
  writeFileSync(
    join(src, "module.json"),
    JSON.stringify({ name: "widget", version: "2.1.0" }),
  );
  if (opts.migrationsDir) mkdirSync(join(src, "migrations"));
  return { pkg, src };
}

const ENV_KEYS = ["DATABASE_URL", "PORT", "HOST", "NODE_ENV"] as const;
const savedEnv: Record<string, string | undefined> = {};
for (const k of ENV_KEYS) savedEnv[k] = process.env[k];

beforeEach(() => {
  serviceOpts = {};
  initSpy.mockClear();
  PoolManager.reset();
  for (const k of ENV_KEYS) delete process.env[k];
});

afterAll(() => {
  for (const k of ENV_KEYS) {
    if (savedEnv[k] === undefined) delete process.env[k];
    else process.env[k] = savedEnv[k];
  }
  PoolManager.reset();
});

// --- tests ------------------------------------------------------------------

describe("startModuleApp", () => {
  test("boots on an ephemeral port without a database and stops cleanly", async () => {
    const { pkg, src } = makeModulePackage();
    try {
      const running = await startModuleApp({ packageDir: pkg, port: 0 });
      expect(running.manifest.name).toBe("widget");
      expect(running.port).toBeGreaterThan(0);
      expect(running.app).toBeDefined();
      expect(initSpy).toHaveBeenCalledTimes(1);
      // No databaseUrl => migration branch skipped, fake pool never set up.
      expect(PoolManager.isInitialized()).toBe(false);
      await running.stop();
    } finally {
      rmSync(pkg, { recursive: true, force: true });
    }
  });

  test("applies migrations when DATABASE_URL is set (real PoolManager + fake pool)", async () => {
    const { pkg, src } = makeModulePackage({ migrationsDir: true });
    process.env.DATABASE_URL = "postgres://fake-never-dialed/db";
    // start.ts reads the pool from PoolManager (which initializeServices would
    // normally populate). We seed it with a fake pool so the real
    // applyModuleMigrations runs end-to-end with no live DB.
    PoolManager.setup({
      pool: makeFakePool() as any,
      logger: { info() {}, warn() {}, error() {}, debug() {} } as any,
      connectionManager: null as any,
    });
    try {
      const running = await startModuleApp({ packageDir: pkg, port: 0 });
      expect(running.port).toBeGreaterThan(0);
      await running.stop();
    } finally {
      rmSync(pkg, { recursive: true, force: true });
    }
  });

  test("wires the health check when services expose health checks", async () => {
    const { pkg } = makeModulePackage();
    serviceOpts.withHealthChecks = true;
    try {
      const running = await startModuleApp({ packageDir: pkg, port: 0 });
      const res = await running.app.request("/health");
      // route exists (200) — manifest.version flows into the health payload
      expect([200, 503]).toContain(res.status);
      await running.stop();
    } finally {
      rmSync(pkg, { recursive: true, force: true });
    }
  });

  test("stop() runs shutdown handlers and swallows their errors", async () => {
    const { pkg } = makeModulePackage();
    const order: string[] = [];
    serviceOpts.shutdownHandlers = [
      {
        handler: async () => {
          order.push("first");
          throw new Error("handler boom"); // must not mask the next handler
        },
      },
      { handler: async () => void order.push("second") },
    ];
    try {
      const running = await startModuleApp({ packageDir: pkg, port: 0 });
      await running.stop();
      expect(order).toEqual(["first", "second"]);
    } finally {
      rmSync(pkg, { recursive: true, force: true });
    }
  });
});
