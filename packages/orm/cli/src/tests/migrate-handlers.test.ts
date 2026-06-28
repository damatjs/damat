import {
  describe,
  it,
  expect,
  mock,
  beforeEach,
  afterEach,
} from "bun:test";
import fs from "node:fs";
import path from "node:path";

/**
 * Full-behavior tests for the migrate:* command handlers.
 *
 * Strategy:
 *  - Config + database-url loading use the REAL `loadModules` / `loadDatabaseUrl`
 *    against throwaway temp `damat.config.ts` files. (Mocking `@/cli/utils/*`
 *    via Bun's process-global `mock.module` would leak into the dedicated
 *    load/paths suites, so we deliberately avoid it.)
 *  - The genuinely external collaborators ARE replaced with `mock.module`:
 *      @damatjs/deps/pg        -> a fake Pool that records connection strings
 *                                 and whether end() was awaited (no real DB).
 *      @damatjs/orm-migration  -> runMigrations / getMigrationStatus /
 *                                 getModuleMigrationStatus / discoverAllMigrations
 *                                 / createInitialMigration / createDiffMigration
 *      @damatjs/orm-processor  -> snapshotExist
 *    These siblings are only reached on the handlers' happy paths, which the
 *    other suites never hit, so the global mocks don't disturb them.
 *  - Pure path logic (`resolveMigrationsPath`) is used real.
 *
 * No database, no real project, no process exits.
 */

const tempBase = path.join(process.cwd(), ".test-migrate-temp");

// Fresh, uniquely-named cwd per test (see note in generate-types.test.ts):
// the handlers hardcode "damat.config.ts" and load.ts cache-busts imports only
// at millisecond resolution, so a unique directory keeps the module cache from
// returning a stale config across fast-running tests.
let tempRoot = tempBase;
let counter = 0;

// Module resolve paths used across tests (absolute so loadModules keeps them).
// Reassigned per test in beforeEach to track the current tempRoot.
let USER = "";
let POST = "";

type Migration = { name: string };
type ModuleStatus = {
  name: string;
  applied: number;
  pending: number;
  migrations: Array<{ name: string; applied: boolean }>;
};

const state = {
  // pg.Pool
  poolConnectionStrings: [] as string[],
  poolEndCalls: 0,

  // orm-migration
  runMigrationsResult: [] as Array<{ success: boolean }>,
  runMigrationsArgs: null as { pool: unknown; modules: unknown } | null,
  migrationStatus: { modules: [] as ModuleStatus[] },
  getMigrationStatusArgs: null as { pool: unknown; resolvers: unknown } | null,
  moduleMigrationStatus: {
    module: {
      name: "user",
      applied: 0,
      pending: 0,
      migrations: [] as Array<{ name: string; applied: boolean }>,
    },
  },
  getModuleStatusArgs: null as { pool: unknown; resolve: unknown } | null,
  allMigrations: [] as Migration[],
  discoverAllArgs: null as unknown,

  // orm-processor
  snapshotExists: false,
  snapshotExistArg: null as unknown,

  // create
  createInitialResult: "/fake/migrations/0001_init.ts",
  createInitialArgs: null as { name: string; resolve: string } | null,
  createInitialThrows: null as Error | null,
  createDiffResult: {
    hasChanges: true,
    filePath: "/fake/migrations/0002_diff.ts",
    warnings: undefined as string[] | undefined,
  },
  createDiffArgs: null as { name: string; resolve: string } | null,
  createDiffThrows: null as Error | null,
};

class FakePool {
  constructor(opts: { connectionString: string }) {
    state.poolConnectionStrings.push(opts.connectionString);
  }
  async end() {
    state.poolEndCalls += 1;
  }
}

mock.module("@damatjs/deps/pg", () => ({ Pool: FakePool }));

mock.module("@damatjs/orm-migration", () => ({
  runMigrations: async (pool: unknown, modules: unknown) => {
    state.runMigrationsArgs = { pool, modules };
    return state.runMigrationsResult;
  },
  getMigrationStatus: async (pool: unknown, resolvers: unknown) => {
    state.getMigrationStatusArgs = { pool, resolvers };
    return state.migrationStatus;
  },
  getModuleMigrationStatus: async (pool: unknown, resolve: unknown) => {
    state.getModuleStatusArgs = { pool, resolve };
    return state.moduleMigrationStatus;
  },
  discoverAllMigrations: (arg: unknown) => {
    state.discoverAllArgs = arg;
    return state.allMigrations;
  },
  createInitialMigration: async (name: string, resolve: string) => {
    state.createInitialArgs = { name, resolve };
    if (state.createInitialThrows) throw state.createInitialThrows;
    return state.createInitialResult;
  },
  createDiffMigration: async (name: string, resolve: string) => {
    state.createDiffArgs = { name, resolve };
    if (state.createDiffThrows) throw state.createDiffThrows;
    return state.createDiffResult;
  },
}));

mock.module("@damatjs/orm-processor", () => ({
  snapshotExist: (dir: string) => {
    state.snapshotExistArg = dir;
    return state.snapshotExists;
  },
}));

function createLogger() {
  const calls: Array<{ level: string; msg: string }> = [];
  const make = (level: string) => (msg: string) =>
    calls.push({ level, msg: String(msg) });
  return {
    calls,
    logger: {
      info: make("info"),
      error: make("error"),
      success: make("success"),
      warn: make("warn"),
      skip: make("skip"),
    },
  };
}

function ctxFor(args: string[] = [], options: Record<string, unknown> = {}) {
  const { calls, logger } = createLogger();
  const ctx: any = {
    command: "migrate",
    args,
    options,
    logger,
    cwd: tempRoot,
  };
  return { ctx, calls };
}

const hasLog = (
  calls: Array<{ level: string; msg: string }>,
  level: string,
  re: RegExp,
) => calls.some((c) => c.level === level && re.test(c.msg));

/**
 * Writes a real damat.config.ts describing modules (name -> resolve path) and,
 * optionally, a projectConfig.databaseUrl.
 */
function writeConfig(opts: {
  modules?: Record<string, string>;
  databaseUrl?: string | null;
}) {
  const moduleEntries = Object.entries(opts.modules ?? {})
    .map(([name, resolve]) => `${name}: { resolve: ${JSON.stringify(resolve)} }`)
    .join(",\n");
  const project =
    opts.databaseUrl === undefined
      ? `databaseUrl: "postgres://u:p@h:5432/db"`
      : opts.databaseUrl === null
        ? ``
        : `databaseUrl: ${JSON.stringify(opts.databaseUrl)}`;
  fs.writeFileSync(
    path.join(tempRoot, "damat.config.ts"),
    `export default { projectConfig: { ${project} }, modules: { ${moduleEntries} } };`,
    "utf-8",
  );
}

beforeEach(() => {
  tempRoot = path.join(tempBase, `t${counter++}`);
  fs.mkdirSync(tempRoot, { recursive: true });
  USER = path.join(tempRoot, "modules", "user");
  POST = path.join(tempRoot, "modules", "post");
  state.poolConnectionStrings = [];
  state.poolEndCalls = 0;
  state.runMigrationsResult = [];
  state.runMigrationsArgs = null;
  state.migrationStatus = { modules: [] };
  state.getMigrationStatusArgs = null;
  state.moduleMigrationStatus = {
    module: { name: "user", applied: 0, pending: 0, migrations: [] },
  };
  state.getModuleStatusArgs = null;
  state.allMigrations = [];
  state.discoverAllArgs = null;
  state.snapshotExists = false;
  state.snapshotExistArg = null;
  state.createInitialResult = "/fake/migrations/0001_init.ts";
  state.createInitialArgs = null;
  state.createInitialThrows = null;
  state.createDiffResult = {
    hasChanges: true,
    filePath: "/fake/migrations/0002_diff.ts",
    warnings: undefined,
  };
  state.createDiffArgs = null;
  state.createDiffThrows = null;
});

afterEach(() => {
  if (fs.existsSync(tempBase)) {
    fs.rmSync(tempBase, { recursive: true, force: true });
  }
});

const loadUp = async () => (await import("../cli/commands/migrate/up")).default;
const loadStatus = async () =>
  (await import("../cli/commands/migrate/status")).default;
const loadList = async () =>
  (await import("../cli/commands/migrate/list")).default;
const loadCreate = async () =>
  (await import("../cli/commands/migrate/create")).default;


// ---------------------------------------------------------------------------
// migrate:up
// ---------------------------------------------------------------------------
describe("migrate:up", () => {
  it("exits 1 when the config file is missing", async () => {
    // No config written -> real loadModules throws.
    const cmd = await loadUp();
    const { ctx, calls } = ctxFor();
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(1);
    expect(hasLog(calls, "error", /Failed to load config:/)).toBe(true);
    expect(state.poolConnectionStrings.length).toBe(0);
  });

  it("exits 1 when no modules are found", async () => {
    writeConfig({ modules: {} });
    const cmd = await loadUp();
    const { ctx, calls } = ctxFor();
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(1);
    expect(hasLog(calls, "error", /No modules found/)).toBe(true);
  });

  it("exits 1 when databaseUrl is empty", async () => {
    writeConfig({ modules: { user: USER }, databaseUrl: null });
    const cmd = await loadUp();
    const { ctx, calls } = ctxFor();
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(1);
    expect(hasLog(calls, "error", /No databaseUrl found/)).toBe(true);
    // Pool is created only after the databaseUrl check, so none here.
    expect(state.poolConnectionStrings.length).toBe(0);
  });

  it("exits 1 when loading the database config throws", async () => {
    // Valid `modules` so loadModules succeeds, but `projectConfig` is a throwing
    // getter so the later loadDatabaseUrl call lands in its catch branch.
    fs.writeFileSync(
      path.join(tempRoot, "damat.config.ts"),
      `export default {
         get projectConfig() { throw new Error("db getter boom"); },
         modules: { user: { resolve: ${JSON.stringify(USER)} } },
       };`,
      "utf-8",
    );
    const cmd = await loadUp();
    const { ctx, calls } = ctxFor();
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(1);
    expect(hasLog(calls, "error", /Failed to load database config/)).toBe(true);
    // Failure happens before the pool is created.
    expect(state.poolConnectionStrings.length).toBe(0);
  });

  it("runs migrations, closes the pool, and exits 0 on success", async () => {
    writeConfig({ modules: { user: USER } });
    state.runMigrationsResult = [{ success: true }, { success: true }];
    const cmd = await loadUp();
    const { ctx, calls } = ctxFor();
    const res = await cmd.handler(ctx);

    expect(res.exitCode).toBe(0);
    expect(state.poolConnectionStrings).toEqual(["postgres://u:p@h:5432/db"]);
    expect(state.runMigrationsArgs?.pool).toBeInstanceOf(FakePool);
    // modules map is keyed by name; the user module resolves to USER.
    expect((state.runMigrationsArgs?.modules as any).user.resolve).toBe(USER);
    expect(state.poolEndCalls).toBe(1);
    expect(hasLog(calls, "success", /Migration completed successfully/)).toBe(true);
  });

  it("exits 1 and still closes the pool when any migration fails", async () => {
    writeConfig({ modules: { user: USER } });
    state.runMigrationsResult = [{ success: true }, { success: false }];
    const cmd = await loadUp();
    const { ctx, calls } = ctxFor();
    const res = await cmd.handler(ctx);

    expect(res.exitCode).toBe(1);
    expect(hasLog(calls, "error", /Migration failed/)).toBe(true);
    expect(state.poolEndCalls).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// migrate:status
// ---------------------------------------------------------------------------
describe("migrate:status", () => {
  it("exits 1 when the config file is missing (before pool creation)", async () => {
    const cmd = await loadStatus();
    const { ctx, calls } = ctxFor();
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(1);
    expect(hasLog(calls, "error", /Failed to load config:/)).toBe(true);
    expect(state.poolConnectionStrings.length).toBe(0);
  });

  it("exits 1 when no modules are found", async () => {
    writeConfig({ modules: {} });
    const cmd = await loadStatus();
    const { ctx, calls } = ctxFor();
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(1);
    expect(hasLog(calls, "error", /No modules found/)).toBe(true);
  });

  it("exits 1 when databaseUrl is empty", async () => {
    writeConfig({ modules: { user: USER }, databaseUrl: null });
    const cmd = await loadStatus();
    const { ctx, calls } = ctxFor();
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(1);
    expect(hasLog(calls, "error", /No databaseUrl found/)).toBe(true);
  });

  it("exits 1 when loading the database config throws", async () => {
    fs.writeFileSync(
      path.join(tempRoot, "damat.config.ts"),
      `export default {
         get projectConfig() { throw new Error("db getter boom"); },
         modules: { user: { resolve: ${JSON.stringify(USER)} } },
       };`,
      "utf-8",
    );
    const cmd = await loadStatus();
    const { ctx, calls } = ctxFor();
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(1);
    expect(hasLog(calls, "error", /Failed to load database config/)).toBe(true);
    expect(state.poolConnectionStrings.length).toBe(0);
  });

  it("reports all-module status when no module is specified", async () => {
    writeConfig({ modules: { user: USER, post: POST } });
    state.migrationStatus = {
      modules: [
        {
          name: "user",
          applied: 2,
          pending: 0,
          migrations: [
            { name: "0001", applied: true },
            { name: "0002", applied: true },
          ],
        },
        {
          name: "post",
          applied: 1,
          pending: 1,
          migrations: [
            { name: "0001", applied: true },
            { name: "0002", applied: false },
          ],
        },
      ],
    };
    const cmd = await loadStatus();
    const { ctx, calls } = ctxFor();
    const res = await cmd.handler(ctx);

    expect(res.exitCode).toBe(0);
    // getMigrationStatus receives the resolve paths of all modules.
    expect(state.getMigrationStatusArgs?.resolvers).toEqual([USER, POST]);
    // 0 pending -> success summary; pending -> info summary.
    expect(hasLog(calls, "success", /user: 2 applied, 0 pending/)).toBe(true);
    expect(hasLog(calls, "info", /post: 1 applied, 1 pending/)).toBe(true);
    // Per-migration: applied -> success, not applied -> info.
    expect(hasLog(calls, "info", /^0002$/)).toBe(true);
    expect(state.poolEndCalls).toBe(1);
  });

  it("reports a single module's status via the --module option", async () => {
    writeConfig({ modules: { user: USER, post: POST } });
    state.moduleMigrationStatus = {
      module: {
        name: "user",
        applied: 1,
        pending: 2,
        migrations: [
          { name: "0001", applied: true },
          { name: "0002", applied: false },
        ],
      },
    };
    const cmd = await loadStatus();
    const { ctx, calls } = ctxFor([], { module: "user" });
    const res = await cmd.handler(ctx);

    expect(res.exitCode).toBe(0);
    expect(state.getModuleStatusArgs?.resolve).toBe(USER);
    // pending > 0 -> info-level summary.
    expect(hasLog(calls, "info", /user: 1 applied, 2 pending/)).toBe(true);
    expect(state.poolEndCalls).toBe(1);
  });

  it("uses a positional arg as the module name when --module is absent", async () => {
    writeConfig({ modules: { user: USER } });
    const cmd = await loadStatus();
    const { ctx } = ctxFor(["user"]);
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(0);
    expect(state.getModuleStatusArgs?.resolve).toBe(USER);
  });

  it("exits 1 (pool still closed) when the selected module is not in config", async () => {
    writeConfig({ modules: { user: USER } });
    const cmd = await loadStatus();
    const { ctx, calls } = ctxFor([], { module: "ghost" });
    const res = await cmd.handler(ctx);

    expect(res.exitCode).toBe(1);
    expect(hasLog(calls, "error", /Module 'ghost' not found in config/)).toBe(true);
    // not-found returns inside the try -> finally still ends the pool.
    expect(state.poolEndCalls).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// migrate:list
// ---------------------------------------------------------------------------
describe("migrate:list", () => {
  it("exits 1 when the config file is missing", async () => {
    const cmd = await loadList();
    const { ctx, calls } = ctxFor();
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(1);
    expect(hasLog(calls, "error", /Failed to load config:/)).toBe(true);
  });

  it("exits 1 when no modules are found", async () => {
    writeConfig({ modules: {} });
    const cmd = await loadList();
    const { ctx, calls } = ctxFor();
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(1);
    expect(hasLog(calls, "error", /No modules found/)).toBe(true);
  });

  it("logs a skip message when there are no migrations", async () => {
    writeConfig({ modules: { user: USER } });
    state.allMigrations = [];
    const cmd = await loadList();
    const { ctx, calls } = ctxFor();
    const res = await cmd.handler(ctx);

    expect(res.exitCode).toBe(0);
    expect(state.discoverAllArgs).toEqual([USER]);
    expect(hasLog(calls, "skip", /No modules with migrations found/)).toBe(true);
  });

  it("counts migrations per module, sorts alphabetically, and pluralizes", async () => {
    writeConfig({ modules: { user: USER, post: POST } });
    state.allMigrations = [
      { name: "user" },
      { name: "user" },
      { name: "post" },
    ];
    const cmd = await loadList();
    const { ctx, calls } = ctxFor();
    const res = await cmd.handler(ctx);

    expect(res.exitCode).toBe(0);
    const infoMsgs = calls.filter((c) => c.level === "info").map((c) => c.msg);
    const postIdx = infoMsgs.findIndex((m) => m === "post (1 migration)");
    const userIdx = infoMsgs.findIndex((m) => m === "user (2 migrations)");
    expect(postIdx).toBeGreaterThanOrEqual(0);
    expect(userIdx).toBeGreaterThanOrEqual(0);
    // Sorted: post before user.
    expect(postIdx).toBeLessThan(userIdx);
  });
});

// ---------------------------------------------------------------------------
// migrate:create
// ---------------------------------------------------------------------------
describe("migrate:create", () => {
  it("exits 1 when module name is missing (no config read)", async () => {
    const cmd = await loadCreate();
    const { ctx, calls } = ctxFor([]);
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(1);
    expect(hasLog(calls, "error", /Module name is required/)).toBe(true);
  });

  it("exits 1 when the config file is missing", async () => {
    const cmd = await loadCreate();
    const { ctx, calls } = ctxFor(["user"]);
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(1);
    expect(hasLog(calls, "error", /Failed to load config:/)).toBe(true);
  });

  it("exits 1 when no modules are found", async () => {
    writeConfig({ modules: {} });
    const cmd = await loadCreate();
    const { ctx, calls } = ctxFor(["user"]);
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(1);
    expect(hasLog(calls, "error", /No modules found/)).toBe(true);
  });

  it("exits 1 when the module is not in config", async () => {
    writeConfig({ modules: { other: POST } });
    const cmd = await loadCreate();
    const { ctx, calls } = ctxFor(["user"]);
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(1);
    expect(hasLog(calls, "error", /Module 'user' not found in config/)).toBe(true);
  });

  it("creates an initial migration when no snapshot exists", async () => {
    writeConfig({ modules: { user: USER } });
    state.snapshotExists = false;
    state.createInitialResult = path.join(USER, "migrations", "0001_init.ts");
    const cmd = await loadCreate();
    const { ctx, calls } = ctxFor(["user"]);
    const res = await cmd.handler(ctx);

    expect(res.exitCode).toBe(0);
    // snapshotExist checked against the resolved (real) migrations dir.
    expect(state.snapshotExistArg).toBe(path.join(USER, "migrations"));
    // createInitialMigration called with name + resolve.
    expect(state.createInitialArgs).toEqual({ name: "user", resolve: USER });
    expect(state.createDiffArgs).toBeNull();
    expect(hasLog(calls, "info", /Creating initial migration/)).toBe(true);
    expect(hasLog(calls, "success", /Migration created/)).toBe(true);
    expect(hasLog(calls, "info", /0001_init\.ts/)).toBe(true);
  });

  it("creates a diff migration (with warnings) when a snapshot exists", async () => {
    writeConfig({ modules: { user: USER } });
    state.snapshotExists = true;
    state.createDiffResult = {
      hasChanges: true,
      filePath: path.join(USER, "migrations", "0002_diff.ts"),
      warnings: ["dropping column is risky"],
    };
    const cmd = await loadCreate();
    const { ctx, calls } = ctxFor(["user"]);
    const res = await cmd.handler(ctx);

    expect(res.exitCode).toBe(0);
    expect(state.createDiffArgs).toEqual({ name: "user", resolve: USER });
    expect(state.createInitialArgs).toBeNull();
    expect(hasLog(calls, "info", /Creating diff migration/)).toBe(true);
    expect(hasLog(calls, "success", /Migration created/)).toBe(true);
    expect(hasLog(calls, "warn", /dropping column is risky/)).toBe(true);
  });

  it("skips (exit 0) when a diff has no changes", async () => {
    writeConfig({ modules: { user: USER } });
    state.snapshotExists = true;
    state.createDiffResult = { hasChanges: false, filePath: "", warnings: undefined };
    const cmd = await loadCreate();
    const { ctx, calls } = ctxFor(["user"]);
    const res = await cmd.handler(ctx);

    expect(res.exitCode).toBe(0);
    expect(hasLog(calls, "skip", /No changes detected/)).toBe(true);
    expect(hasLog(calls, "success", /Migration created/)).toBe(false);
  });

  it("exits 1 and logs the message when migration creation throws", async () => {
    writeConfig({ modules: { user: USER } });
    state.snapshotExists = false;
    state.createInitialThrows = new Error("write denied");
    const cmd = await loadCreate();
    const { ctx, calls } = ctxFor(["user"]);
    const res = await cmd.handler(ctx);

    expect(res.exitCode).toBe(1);
    expect(hasLog(calls, "error", /write denied/)).toBe(true);
  });
});
