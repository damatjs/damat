import { describe, expect, test, beforeEach, afterAll, mock } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

/**
 * DB-boundary tests for the harness + migration tooling.
 *
 * These functions hardwire `new ConnectionManager(...)` from
 * @damatjs/orm-connector, whose `.connect()` opens a real Postgres socket. We
 * mock ONLY that boundary with a faithful fake whose `connect()` hands back an
 * in-memory fake pg Pool — no live database is touched, so the real branch
 * logic in boot.ts / with.ts / tooling/migration.ts runs and is measured.
 *
 * Leak-safety: the mock factory re-exports the REAL module (testPoolConfig,
 * ConnectionError, …) and overrides only `ConnectionManager`, so other test
 * files that use `testPoolConfig` keep working. @damatjs/services (PoolManager)
 * is deliberately NOT mocked — boot/teardown drive the real shared-state
 * manager, which is the behaviour worth covering.
 *
 * With no `.sql` files in the module's migrations dir, the real
 * @damatjs/orm-migration code path discovers zero pending migrations and never
 * executes SQL — it only issues idempotent ensureTable/bootstrap queries that
 * the fake pool answers.
 */

// --- in-memory fake pg Pool / ConnectionManager -----------------------------

// Rows the next-created fake pool reports as already-applied for getApplied().
// Lets a test exercise the appliedRows.map((row) => row.name) path.
let nextAppliedRows: { module: string; name: string; applied_at: Date }[] = [];

function makeFakePool() {
  const appliedRows = nextAppliedRows;
  const answer = async (text: string) => {
    // The tracker's getApplied issues a SELECT against the logs table.
    if (/SELECT[\s\S]*_damat_migration_logs/i.test(text)) {
      return { rows: appliedRows, rowCount: appliedRows.length };
    }
    return { rows: [], rowCount: 0 };
  };
  const fakeClient = {
    query: mock(answer),
    release: mock(() => {}),
  };
  return {
    query: mock(answer),
    connect: mock(async () => fakeClient),
    end: mock(async () => {}),
    totalCount: 1,
    idleCount: 1,
    waitingCount: 0,
  };
}

const fakePools: ReturnType<typeof makeFakePool>[] = [];
const disconnections: number[] = [];

class FakeConnectionManager {
  config: unknown;
  logger: unknown;
  pool: ReturnType<typeof makeFakePool> | null = null;
  constructor(config: unknown, logger: unknown) {
    this.config = config;
    this.logger = logger;
  }
  async connect() {
    this.pool = makeFakePool();
    fakePools.push(this.pool);
    return this.pool;
  }
  async disconnect() {
    disconnections.push(Date.now());
    this.pool = null;
  }
  async healthCheck() {
    return { connected: true, poolStats: {}, lastChecked: new Date() };
  }
  getPoolStats() {
    return { totalCount: 1, idleCount: 1, waitingCount: 0 };
  }
}

// Pull the REAL module in by its resolved absolute path so the factory below
// can re-export its members (testPoolConfig, ConnectionError, …) without
// recursing into this very mock.
const REAL_CONNECTOR_PATH = Bun.resolveSync(
  "@damatjs/orm-connector",
  import.meta.dir,
);
const realConnector = await import(REAL_CONNECTOR_PATH);

mock.module("@damatjs/orm-connector", () => ({
  ...realConnector,
  ConnectionManager: FakeConnectionManager,
}));

// Imported AFTER the mock is registered.
const { bootModule, withModule } = await import("../src/harness/boot").then(
  async (m) => ({
    bootModule: m.bootModule,
    withModule: (await import("../src/harness/with")).withModule,
  }),
);
const { runModuleMigration, runModuleMigrationStatus } =
  await import("../src/tooling/migration");
import { PoolManager } from "@damatjs/services";

// --- fixtures ---------------------------------------------------------------

function makeModulePackage(opts: { withMigrationsDir?: boolean } = {}): {
  pkg: string;
  src: string;
} {
  const pkg = mkdtempSync(join(tmpdir(), "damat-boundary-"));
  const src = join(pkg, "src");
  mkdirSync(src);
  writeFileSync(
    join(src, "module.json"),
    JSON.stringify({ name: "widget", version: "1.0.0" }),
  );
  if (opts.withMigrationsDir) mkdirSync(join(src, "migrations"));
  return { pkg, src };
}

function fakeModule() {
  const init = mock(() => {});
  return {
    name: "widget",
    service: { widget: { create: () => ({}) } },
    init,
  };
}

// runModuleMigration/Status read DATABASE_URL via resolveDatabaseConfig({}).
// The value is never dialed — ConnectionManager is the fake above — but it must
// be present so the config resolves. Save/restore around the suite.
const savedDbUrl = process.env.DATABASE_URL;
process.env.DATABASE_URL = "postgres://fake-never-connected/db";

beforeEach(() => {
  fakePools.length = 0;
  disconnections.length = 0;
  nextAppliedRows = [];
  PoolManager.reset();
});

afterAll(() => {
  if (savedDbUrl === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = savedDbUrl;
  PoolManager.reset();
});

// --- bootModule -------------------------------------------------------------

describe("bootModule", () => {
  test("connects, wires PoolManager, applies migrations, and inits the module", async () => {
    const { pkg, src } = makeModulePackage({ withMigrationsDir: true });
    const mod = fakeModule();
    try {
      const booted = await bootModule(mod, {
        databaseUrl: "postgres://fake",
        moduleDir: src,
      });
      expect(mod.init).toHaveBeenCalledTimes(1);
      expect(booted.service).toBe(mod.service);
      expect(booted.manifest?.name).toBe("widget");
      expect(PoolManager.isInitialized()).toBe(true);
      expect(booted.pool).toBe(fakePools[0] as any);

      await booted.teardown();
      expect(PoolManager.isInitialized()).toBe(false);
      expect(disconnections.length).toBe(1);
    } finally {
      rmSync(pkg, { recursive: true, force: true });
    }
  });

  test("boots without a moduleDir (no manifest, no migrations)", async () => {
    const mod = fakeModule();
    const booted = await bootModule(mod, { databaseUrl: "postgres://fake" });
    expect(booted.manifest).toBeNull();
    expect(mod.init).toHaveBeenCalledTimes(1);
    await booted.teardown();
  });

  test("uses a caller-supplied logger when provided", async () => {
    const mod = fakeModule();
    const logger = {
      info: mock(() => {}),
      warn: mock(() => {}),
      error: mock(() => {}),
      debug: mock(() => {}),
    } as any;
    const booted = await bootModule(mod, {
      databaseUrl: "postgres://fake",
      logger,
    });
    await booted.teardown();
    expect(booted.connection).toBeInstanceOf(FakeConnectionManager);
  });
});

// --- withModule -------------------------------------------------------------

describe("withModule", () => {
  test("runs the callback against the booted module and tears down after", async () => {
    const mod = fakeModule();
    let sawService: unknown;
    const result = await withModule(
      mod,
      { databaseUrl: "postgres://fake" },
      async (booted) => {
        sawService = booted.service;
        return "done";
      },
    );
    expect(result).toBe("done");
    expect(sawService).toBe(mod.service);
    expect(disconnections.length).toBe(1);
    expect(PoolManager.isInitialized()).toBe(false);
  });

  test("tears down even when the callback throws", async () => {
    const mod = fakeModule();
    await expect(
      withModule(mod, { databaseUrl: "postgres://fake" }, async () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
    expect(disconnections.length).toBe(1);
    expect(PoolManager.isInitialized()).toBe(false);
  });
});

// --- runModuleMigration -----------------------------------------------------

describe("runModuleMigration", () => {
  test("returns hadMigrations=false when there is no migrations directory", async () => {
    const { pkg } = makeModulePackage();
    try {
      const result = await runModuleMigration(pkg);
      expect(result.hadMigrations).toBe(false);
      expect(result.success).toBe(true);
      expect(result.moduleName).toBe("widget");
      expect(result.applied).toEqual([]);
      // Never connected — short-circuited before touching the DB boundary.
      expect(fakePools.length).toBe(0);
    } finally {
      rmSync(pkg, { recursive: true, force: true });
    }
  });

  test("connects and applies migrations when a migrations directory exists", async () => {
    const { pkg } = makeModulePackage({ withMigrationsDir: true });
    try {
      const result = await runModuleMigration(pkg);
      expect(result.hadMigrations).toBe(true);
      expect(result.success).toBe(true);
      expect(result.applied).toEqual([]); // no .sql files => nothing pending
      expect(fakePools.length).toBe(1);
      expect(disconnections.length).toBe(1); // finally: disconnect
    } finally {
      rmSync(pkg, { recursive: true, force: true });
    }
  });
});

// --- runModuleMigrationStatus -----------------------------------------------

describe("runModuleMigrationStatus", () => {
  test("returns hadMigrations=false with empty status when no migrations dir", async () => {
    const { pkg } = makeModulePackage();
    try {
      const status = await runModuleMigrationStatus(pkg);
      expect(status.hadMigrations).toBe(false);
      expect(status.migrations).toEqual([]);
      expect(status.applied).toBe(0);
      expect(status.pending).toBe(0);
      expect(fakePools.length).toBe(0);
    } finally {
      rmSync(pkg, { recursive: true, force: true });
    }
  });

  test("connects and reports per-migration status when a migrations dir exists", async () => {
    const { pkg } = makeModulePackage({ withMigrationsDir: true });
    try {
      const status = await runModuleMigrationStatus(pkg);
      expect(status.hadMigrations).toBe(true);
      expect(status.moduleName).toBe("widget");
      // no .sql files discovered => empty migration list
      expect(status.migrations).toEqual([]);
      expect(fakePools.length).toBe(1);
      expect(disconnections.length).toBe(1);
    } finally {
      rmSync(pkg, { recursive: true, force: true });
    }
  });

  test("maps each discovered .sql migration to its applied flag", async () => {
    const { pkg, src } = makeModulePackage({ withMigrationsDir: true });
    // A real migration file so discoverModuleMigrations returns an entry and
    // the per-migration mapping runs. The fake tracker reports none applied.
    writeFileSync(
      join(src, "migrations", "Migration20260101120000_Init.sql"),
      "CREATE TABLE widget ();\n",
    );
    try {
      const status = await runModuleMigrationStatus(pkg);
      expect(status.hadMigrations).toBe(true);
      expect(status.migrations).toEqual([
        { name: "Migration20260101120000_Init", applied: false },
      ]);
      expect(status.pending).toBe(1);
      expect(status.applied).toBe(0);
    } finally {
      rmSync(pkg, { recursive: true, force: true });
    }
  });

  test("marks a migration applied when the tracker reports it (covers the applied-rows map)", async () => {
    const { pkg, src } = makeModulePackage({ withMigrationsDir: true });
    writeFileSync(
      join(src, "migrations", "Migration20260101120000_Init.sql"),
      "CREATE TABLE widget ();\n",
    );
    // The fake pool's getApplied SELECT returns this row.
    nextAppliedRows = [
      {
        module: "widget",
        name: "Migration20260101120000_Init",
        applied_at: new Date(),
      },
    ];
    try {
      const status = await runModuleMigrationStatus(pkg);
      expect(status.migrations).toEqual([
        { name: "Migration20260101120000_Init", applied: true },
      ]);
      expect(status.applied).toBe(1);
      expect(status.pending).toBe(0);
    } finally {
      rmSync(pkg, { recursive: true, force: true });
    }
  });
});
