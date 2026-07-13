import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { bootstrapDatabase, GENERATE_ID_SQL } from "../executor/bootstrap";
import { executeMigration } from "../executor/migration";
import { runMigrations } from "../executor/run";
import {
  getMigrationStatus,
  getModuleMigrationStatus,
} from "../executor/status";
import { MigrationTracker } from "../tracker";
import type { MigrationInfo } from "../types";

/**
 * Executor tests use a fake pg Pool — NO real database.
 *
 * The fake records:
 *   - top-level `pool.query()` calls (used by MigrationTracker), and
 *   - client `query()` calls obtained via `pool.connect()` (used by bootstrap
 *     and by executeMigration's transaction).
 *
 * Applied-migration rows are returned for SELECT ... status='applied' queries
 * from a caller-supplied table keyed by module name, so we can simulate
 * "already applied" migrations and assert skip/idempotency behaviour.
 *
 * Migration .sql files are written into a real os.tmpdir() folder so the
 * filesystem-backed discovery + readFileSync paths run for real, then cleaned
 * up. Nothing is written into the repo tree.
 */

interface RecordedQuery {
  sql: string;
  params?: unknown[];
}

interface FakePoolOptions {
  /** Rows returned for `getApplied(module)` SELECTs, keyed by module name. */
  applied?: Record<
    string,
    { module: string; name: string; applied_at: Date }[]
  >;
  /** When set, the client query matching this predicate throws (to test rollback). */
  failOn?: (sql: string) => boolean;
}

function makeFakePool(opts: FakePoolOptions = {}) {
  const poolQueries: RecordedQuery[] = [];
  const clientQueries: RecordedQuery[] = [];
  let releaseCount = 0;
  let connectCount = 0;

  const resolveApplied = (sql: string, params?: unknown[]) => {
    if (!/status = 'applied'/.test(sql)) return undefined;
    const moduleParam = params?.[0] as string | undefined;
    if (moduleParam && opts.applied?.[moduleParam]) {
      return opts.applied[moduleParam];
    }
    if (!moduleParam) {
      return Object.values(opts.applied ?? {}).flat();
    }
    return [];
  };

  const pool = {
    query: async (sql: string, params?: unknown[]) => {
      poolQueries.push({ sql, params });
      const rows = resolveApplied(sql, params) ?? [];
      return { rows, rowCount: rows.length };
    },
    connect: async () => {
      connectCount++;
      return {
        query: async (sql: string, params?: unknown[]) => {
          clientQueries.push({ sql, params });
          if (opts.failOn?.(sql)) {
            throw new Error("boom: " + sql.slice(0, 20));
          }
          return { rows: [], rowCount: 0 };
        },
        release: () => {
          releaseCount++;
        },
      };
    },
  };

  return {
    pool: pool as any,
    poolQueries,
    clientQueries,
    get releaseCount() {
      return releaseCount;
    },
    get connectCount() {
      return connectCount;
    },
  };
}

let tmpRoot: string;
let moduleCounter = 0;

/** Create a module dir with migrations/ containing the named .sql files. */
function makeModule(files: { name: string; sql?: string }[]): {
  dir: string;
  name: string;
} {
  const name = `module_${moduleCounter}`;
  const dir = path.join(tmpRoot, `mod_${moduleCounter++}`);
  const migrationsDir = path.join(dir, "migrations");
  fs.mkdirSync(migrationsDir, { recursive: true });
  for (const f of files) {
    fs.writeFileSync(
      path.join(migrationsDir, `${f.name}.sql`),
      f.sql ?? `-- ${f.name}\nSELECT 1;`,
    );
  }
  return { dir, name };
}

/** Build an OrmModuleContainer-shaped map (name-keyed, resolve = dir). */
function container(modules: { dir: string; name: string }[]) {
  const c: Record<
    string,
    { id: string; name: string; path: string; resolve: string }
  > = {};
  for (const m of modules) {
    c[m.name] = { id: m.name, name: m.name, path: m.dir, resolve: m.dir };
  }
  return c;
}

beforeEach(() => {
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "orm-mig-exec-"));
});

afterEach(() => {
  fs.rmSync(tmpRoot, { recursive: true, force: true });
});

describe("bootstrapDatabase", () => {
  it("runs the generate_id bootstrap SQL on a pooled client and releases it", async () => {
    const fake = makeFakePool();
    await bootstrapDatabase(fake.pool);

    expect(fake.connectCount).toBe(1);
    expect(fake.clientQueries).toHaveLength(1);
    expect(fake.clientQueries[0]!.sql).toBe(GENERATE_ID_SQL);
    expect(fake.clientQueries[0]!.sql).toContain(
      "CREATE OR REPLACE FUNCTION generate_id",
    );
    expect(fake.releaseCount).toBe(1);
  });

  it("releases the client even when the bootstrap query throws", async () => {
    const fake = makeFakePool({ failOn: () => true });
    await expect(bootstrapDatabase(fake.pool)).rejects.toThrow("boom");
    expect(fake.releaseCount).toBe(1);
  });
});

describe("executeMigration", () => {
  function makeMigrationInfo(dir: string, name: string): MigrationInfo {
    return {
      name,
      resolver: dir,
      path: path.resolve(dir, "migrations", `${name}.sql`),
      timestamp: 0,
      applied: false,
    };
  }

  it("runs the SQL inside a BEGIN/COMMIT transaction and records it applied", async () => {
    const { dir } = makeModule([
      { name: "Migration1_Initial", sql: "CREATE TABLE users (id text);" },
    ]);
    const fake = makeFakePool();
    const tracker = new MigrationTracker(fake.pool);
    const info = makeMigrationInfo(dir, "Migration1_Initial");

    const result = await executeMigration(fake.pool, info, "user", tracker);

    expect(result.success).toBe(true);
    const sqls = fake.clientQueries.map((q) => q.sql);
    expect(sqls[0]).toBe("BEGIN");
    expect(sqls).toContain("CREATE TABLE users (id text);");
    expect(sqls[sqls.length - 1]).toBe("COMMIT");
    expect(fake.releaseCount).toBe(1);

    // Recorded as applied via the tracker (pool-level INSERT).
    const insert = fake.poolQueries.find((q) =>
      /INSERT INTO "_damat_migration_logs"/.test(q.sql),
    );
    expect(insert).toBeDefined();
    expect(insert!.params?.[1]).toBe("user");
    expect(insert!.params?.[2]).toBe("Migration1_Initial");
  });

  it("rolls back and returns the error when the SQL fails", async () => {
    const { dir } = makeModule([{ name: "Migration1_Bad", sql: "BAD SQL;" }]);
    const fake = makeFakePool({ failOn: (sql) => sql === "BAD SQL;" });
    const tracker = new MigrationTracker(fake.pool);
    const info = makeMigrationInfo(dir, "Migration1_Bad");

    const result = await executeMigration(fake.pool, info, "user", tracker);

    expect(result.success).toBe(false);
    expect(result.error).toBeInstanceOf(Error);
    const sqls = fake.clientQueries.map((q) => q.sql);
    expect(sqls).toContain("ROLLBACK");
    expect(sqls).not.toContain("COMMIT");
    // Failure means nothing recorded as applied.
    expect(
      fake.poolQueries.some((q) =>
        /INSERT INTO "_damat_migration_logs"/.test(q.sql),
      ),
    ).toBe(false);
    expect(fake.releaseCount).toBe(1);
  });

  it("returns failure (not throw) when the migration file is missing", async () => {
    const { dir } = makeModule([]);
    const fake = makeFakePool();
    const tracker = new MigrationTracker(fake.pool);
    const info = makeMigrationInfo(dir, "Migration404_Missing");

    const result = await executeMigration(fake.pool, info, "user", tracker);
    expect(result.success).toBe(false);
    expect(result.error).toBeInstanceOf(Error);
  });
});

describe("runMigrations", () => {
  it("bootstraps, applies all pending migrations in order, and records them", async () => {
    const mod = makeModule([
      { name: "Migration20260101000000_Initial" },
      { name: "Migration20260201000000_AddEmail" },
    ]);
    const fake = makeFakePool();

    const results = await runMigrations(fake.pool, container([mod]) as any);

    expect(results).toHaveLength(1);
    expect(results[0]!.success).toBe(true);
    // Both applied, in timestamp order.
    expect(results[0]!.applied).toEqual([
      "Migration20260101000000_Initial",
      "Migration20260201000000_AddEmail",
    ]);
    expect(results[0]!.pending).toEqual([
      "Migration20260101000000_Initial",
      "Migration20260201000000_AddEmail",
    ]);

    // Tracking table ensured + bootstrap function created.
    expect(
      fake.poolQueries.some((q) =>
        /CREATE TABLE IF NOT EXISTS "_damat_migration_logs"/.test(q.sql),
      ),
    ).toBe(true);
    expect(fake.clientQueries.some((q) => /generate_id/.test(q.sql))).toBe(
      true,
    );
  });

  it("skips migrations already recorded as applied (idempotency)", async () => {
    const mod = makeModule([
      { name: "Migration20260101000000_Initial" },
      { name: "Migration20260201000000_AddEmail" },
    ]);
    const fake = makeFakePool({
      applied: {
        [mod.name]: [
          {
            module: mod.name,
            name: "Migration20260101000000_Initial",
            applied_at: new Date(),
          },
        ],
      },
    });

    const results = await runMigrations(fake.pool, container([mod]) as any);

    // Only the second migration is pending/applied this run.
    expect(results[0]!.pending).toEqual(["Migration20260201000000_AddEmail"]);
    expect(results[0]!.applied).toEqual(["Migration20260201000000_AddEmail"]);
    // Exactly one migration transaction ran (the pending one), not two.
    const beginCount = fake.clientQueries.filter(
      (q) => q.sql === "BEGIN",
    ).length;
    expect(beginCount).toBe(1);
    // The pending migration's body ran; the already-applied one did not get
    // re-recorded with a fresh INSERT for the *Initial* migration this run.
    const inserts = fake.poolQueries.filter((q) =>
      /INSERT INTO "_damat_migration_logs"/.test(q.sql),
    );
    expect(inserts).toHaveLength(1);
    expect(inserts[0]!.params?.[2]).toBe("Migration20260201000000_AddEmail");
  });

  it("reports no pending migrations when all are applied", async () => {
    const mod = makeModule([{ name: "Migration20260101000000_Initial" }]);
    const fake = makeFakePool({
      applied: {
        [mod.name]: [
          {
            module: mod.name,
            name: "Migration20260101000000_Initial",
            applied_at: new Date(),
          },
        ],
      },
    });

    const results = await runMigrations(fake.pool, container([mod]) as any);
    expect(results[0]!.applied).toEqual([]);
    expect(results[0]!.pending).toEqual([]);
    expect(results[0]!.success).toBe(true);
    // No transaction started (nothing to run).
    expect(fake.clientQueries.some((q) => q.sql === "BEGIN")).toBe(false);
  });

  it("stops applying after the first failing migration and surfaces the error", async () => {
    const mod = makeModule([
      { name: "Migration20260101000000_Ok", sql: "SELECT 1;" },
      { name: "Migration20260201000000_Bad", sql: "FAIL HERE;" },
      { name: "Migration20260301000000_Never", sql: "SELECT 2;" },
    ]);
    const fake = makeFakePool({ failOn: (sql) => sql === "FAIL HERE;" });

    const results = await runMigrations(fake.pool, container([mod]) as any);

    expect(results[0]!.success).toBe(false);
    expect(results[0]!.error).toBeInstanceOf(Error);
    // First succeeded; failing one aborted; third never ran.
    expect(results[0]!.applied).toEqual(["Migration20260101000000_Ok"]);
    expect(fake.clientQueries.some((q) => q.sql === "SELECT 2;")).toBe(false);
  });

  it("holds pg_advisory_lock for the whole run and always unlocks", async () => {
    const mod = makeModule([{ name: "Migration20260101000000_Initial" }]);
    const fake = makeFakePool();

    await runMigrations(fake.pool, container([mod]) as any);

    const sqls = fake.clientQueries.map((q) => q.sql);
    // Lock is the very first session command (before ensureTable/bootstrap),
    // unlock the very last, so concurrent deploys fully serialize.
    expect(sqls[0]).toMatch(/pg_advisory_lock\(\d+\)/);
    expect(sqls[sqls.length - 1]).toMatch(/pg_advisory_unlock\(\d+\)/);
    // Lock and unlock use the same key.
    expect(sqls[0]!.match(/\d+/)![0]).toBe(
      sqls[sqls.length - 1]!.match(/\d+/)![0],
    );
  });

  it("unlocks and releases the lock session even when a migration fails", async () => {
    const mod = makeModule([
      { name: "Migration20260101000000_Bad", sql: "BAD;" },
    ]);
    const fake = makeFakePool({ failOn: (sql) => sql === "BAD;" });

    const results = await runMigrations(fake.pool, container([mod]) as any);

    expect(results[0]!.success).toBe(false);
    const sqls = fake.clientQueries.map((q) => q.sql);
    expect(sqls[sqls.length - 1]).toMatch(/pg_advisory_unlock/);
    // Every checked-out client (lock, bootstrap, migration) was released.
    expect(fake.releaseCount).toBe(fake.connectCount);
  });

  it("processes multiple modules, returning one result per module", async () => {
    const a = makeModule([{ name: "Migration20260101000000_A" }]);
    const b = makeModule([{ name: "Migration20260101000000_B" }]);

    const results = await runMigrations(
      fakeFor([a, b]).pool,
      container([a, b]) as any,
    );
    expect(results).toHaveLength(2);
    expect(results.every((r) => r.success)).toBe(true);
  });
});

// Helper so the multi-module test can build a fresh pool inline.
function fakeFor(_mods: { dir: string; name: string }[]) {
  return makeFakePool();
}

describe("getMigrationStatus / getModuleMigrationStatus", () => {
  it("reports applied vs pending counts per module", async () => {
    const mod = makeModule([
      { name: "Migration20260101000000_Initial" },
      { name: "Migration20260201000000_AddEmail" },
    ]);
    // Tracker rows are keyed by module NAME (what runMigrations records),
    // never by the resolve path.
    const fake = makeFakePool({
      applied: {
        [mod.name]: [
          {
            module: mod.name,
            name: "Migration20260101000000_Initial",
            applied_at: new Date(),
          },
        ],
      },
    });

    const status = await getMigrationStatus(fake.pool, container([mod]) as any);
    expect(status.modules).toHaveLength(1);
    const m = status.modules[0]!;
    expect(m.name).toBe(mod.name);
    expect(m.applied).toBe(1);
    expect(m.pending).toBe(1);
    // The applied flag is set on the matching migration only.
    const initial = m.migrations.find((x) => x.name.endsWith("_Initial"));
    const email = m.migrations.find((x) => x.name.endsWith("_AddEmail"));
    expect(initial!.applied).toBe(true);
    expect(email!.applied).toBe(false);
  });

  it("reports all-pending when nothing is applied", async () => {
    const mod = makeModule([{ name: "Migration20260101000000_Initial" }]);
    const fake = makeFakePool();
    const status = await getMigrationStatus(fake.pool, container([mod]) as any);
    expect(status.modules[0]!.applied).toBe(0);
    expect(status.modules[0]!.pending).toBe(1);
  });

  it("getModuleMigrationStatus throws when a module has no migrations", async () => {
    const emptyDir = path.join(tmpRoot, "no-migs");
    fs.mkdirSync(emptyDir, { recursive: true });
    const fake = makeFakePool();
    await expect(
      getModuleMigrationStatus(
        fake.pool,
        container([{ dir: emptyDir, name: "empty" }]).empty as any,
      ),
    ).rejects.toThrow("Module 'empty' not found or has no migrations");
  });

  it("getModuleMigrationStatus reports a single module's status", async () => {
    const mod = makeModule([
      { name: "Migration20260101000000_Initial" },
      { name: "Migration20260201000000_AddEmail" },
    ]);
    const fake = makeFakePool({
      applied: {
        [mod.name]: [
          {
            module: mod.name,
            name: "Migration20260201000000_AddEmail",
            applied_at: new Date(),
          },
        ],
      },
    });

    const { module } = await getModuleMigrationStatus(
      fake.pool,
      container([mod])[mod.name] as any,
    );
    expect(module.name).toBe(mod.name);
    expect(module.applied).toBe(1);
    expect(module.pending).toBe(1);
    expect(module.migrations).toHaveLength(2);
  });
});
