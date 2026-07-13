import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { executeMigration } from "../executor/migration";
import { MigrationTracker } from "../tracker";
import type { MigrationInfo } from "../types";

/**
 * Edge-case coverage for executeMigration.
 *
 * Uses the same fake-pg-Pool pattern as executor.test.ts: the pool exposes a
 * top-level `query()` (used by MigrationTracker) and a `connect()` that hands
 * back a client recording BEGIN/COMMIT/ROLLBACK/<sql>. Migration .sql files are
 * written to a throwaway os.tmpdir() folder so readFileSync runs for real. No
 * live database is involved.
 */

interface RecordedQuery {
  sql: string;
  params?: unknown[];
}

interface FakePoolOptions {
  /** When set, the client query matching this predicate throws (to test rollback). */
  failOn?: (sql: string) => boolean;
  /** When set, the top-level pool.query matching this predicate throws. */
  poolFailOn?: (sql: string) => boolean;
}

function makeFakePool(opts: FakePoolOptions = {}) {
  const poolQueries: RecordedQuery[] = [];
  const clientQueries: RecordedQuery[] = [];
  let releaseCount = 0;
  let connectCount = 0;

  const pool = {
    query: async (sql: string, params?: unknown[]) => {
      poolQueries.push({ sql, params });
      if (opts.poolFailOn?.(sql)) {
        throw new Error("pool-boom: " + sql.slice(0, 20));
      }
      return { rows: [], rowCount: 0 };
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

function makeModule(files: { name: string; sql?: string }[]): string {
  const dir = path.join(tmpRoot, `mod_${moduleCounter++}`);
  const migrationsDir = path.join(dir, "migrations");
  fs.mkdirSync(migrationsDir, { recursive: true });
  for (const f of files) {
    fs.writeFileSync(
      path.join(migrationsDir, `${f.name}.sql`),
      f.sql ?? `-- ${f.name}\nSELECT 1;`,
    );
  }
  return dir;
}

function makeMigrationInfo(dir: string, name: string): MigrationInfo {
  return {
    name,
    resolver: dir,
    path: path.resolve(dir, "migrations", `${name}.sql`),
    timestamp: 0,
    applied: false,
  };
}

beforeEach(() => {
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "orm-mig-exec-edge-"));
});

afterEach(() => {
  fs.rmSync(tmpRoot, { recursive: true, force: true });
});

describe("executeMigration — empty / whitespace migration file", () => {
  it("commits an empty migration file (no SQL body) and records it applied", async () => {
    const dir = makeModule([{ name: "Migration1_Empty", sql: "" }]);
    const fake = makeFakePool();
    const tracker = new MigrationTracker(fake.pool);

    const result = await executeMigration(
      fake.pool,
      makeMigrationInfo(dir, "Migration1_Empty"),
      "user",
      tracker,
    );

    expect(result.success).toBe(true);
    const sqls = fake.clientQueries.map((q) => q.sql);
    // The transaction is still wrapped, and the (empty) body is still issued.
    expect(sqls[0]).toBe("BEGIN");
    expect(sqls).toContain(""); // empty body passed straight to pg
    expect(sqls[sqls.length - 1]).toBe("COMMIT");
    expect(sqls).not.toContain("ROLLBACK");
    // Still recorded as applied (no body to fail on).
    expect(
      fake.poolQueries.some((q) =>
        /INSERT INTO "_damat_migration_logs"/.test(q.sql),
      ),
    ).toBe(true);
    expect(fake.releaseCount).toBe(1);
  });

  it("commits a comments-only migration file and records it applied", async () => {
    const dir = makeModule([
      { name: "Migration1_CommentsOnly", sql: "-- nothing to do here\n" },
    ]);
    const fake = makeFakePool();
    const tracker = new MigrationTracker(fake.pool);

    const result = await executeMigration(
      fake.pool,
      makeMigrationInfo(dir, "Migration1_CommentsOnly"),
      "user",
      tracker,
    );

    expect(result.success).toBe(true);
    expect(fake.clientQueries.map((q) => q.sql)).toContain(
      "-- nothing to do here\n",
    );
  });
});

describe("executeMigration — invalid SQL / rollback path", () => {
  it("ROLLBACK is issued (and COMMIT is not) when the body query fails", async () => {
    const dir = makeModule([
      { name: "Migration1_Invalid", sql: "THIS IS NOT SQL;" },
    ]);
    const fake = makeFakePool({ failOn: (sql) => sql === "THIS IS NOT SQL;" });
    const tracker = new MigrationTracker(fake.pool);

    const result = await executeMigration(
      fake.pool,
      makeMigrationInfo(dir, "Migration1_Invalid"),
      "user",
      tracker,
    );

    expect(result.success).toBe(false);
    expect(result.error).toBeInstanceOf(Error);
    const sqls = fake.clientQueries.map((q) => q.sql);
    // Exact ordering: BEGIN, body (threw), then ROLLBACK — never COMMIT.
    expect(sqls).toEqual(["BEGIN", "THIS IS NOT SQL;", "ROLLBACK"]);
    // The failure surfaces the original error message, not the rollback's.
    expect(result.error!.message).toContain("boom");
    // Nothing recorded as applied on failure.
    expect(
      fake.poolQueries.some((q) =>
        /INSERT INTO "_damat_migration_logs"/.test(q.sql),
      ),
    ).toBe(false);
    // Client is always released, even on the failure path.
    expect(fake.releaseCount).toBe(1);
  });

  it("surfaces the original error (not the rollback's) when ROLLBACK also fails", async () => {
    const dir = makeModule([{ name: "Migration1_Bad", sql: "BAD BODY;" }]);
    const fake = makeFakePool({
      failOn: (sql) => sql === "BAD BODY;" || sql === "ROLLBACK",
    });
    const tracker = new MigrationTracker(fake.pool);

    const result = await executeMigration(
      fake.pool,
      makeMigrationInfo(dir, "Migration1_Bad"),
      "user",
      tracker,
    );

    expect(result.success).toBe(false);
    // The body's error wins; the rollback failure is swallowed.
    expect(result.error!.message).toContain("BAD BODY;");
    expect(result.error!.message).not.toContain("ROLLBACK");
    expect(fake.releaseCount).toBe(1);
  });

  it("does not re-throw to the caller — returns a failure result instead", async () => {
    const dir = makeModule([{ name: "Migration1_Bad", sql: "BAD;" }]);
    const fake = makeFakePool({ failOn: (sql) => sql === "BAD;" });
    const tracker = new MigrationTracker(fake.pool);

    // The promise must resolve (not reject), surfacing the error in the result.
    const result = await executeMigration(
      fake.pool,
      makeMigrationInfo(dir, "Migration1_Bad"),
      "user",
      tracker,
    );
    expect(result.success).toBe(false);
  });
});

describe("executeMigration — file-not-found", () => {
  it("returns failure (does not throw) and never opens a transaction", async () => {
    const dir = makeModule([]); // no files written
    const fake = makeFakePool();
    const tracker = new MigrationTracker(fake.pool);

    const result = await executeMigration(
      fake.pool,
      makeMigrationInfo(dir, "Migration404_Missing"),
      "user",
      tracker,
    );

    expect(result.success).toBe(false);
    expect(result.error).toBeInstanceOf(Error);
    // readFileSync failed before connect(): no client, no BEGIN, nothing recorded.
    expect(fake.connectCount).toBe(0);
    expect(fake.clientQueries).toHaveLength(0);
    expect(fake.releaseCount).toBe(0);
    expect(
      fake.poolQueries.some((q) =>
        /INSERT INTO "_damat_migration_logs"/.test(q.sql),
      ),
    ).toBe(false);
    // Node's ENOENT message leaks through.
    expect(result.error!.message).toMatch(/ENOENT|no such file/i);
  });
});

describe("executeMigration — statements that can't run in a transaction", () => {
  it("runs a CREATE INDEX CONCURRENTLY migration WITHOUT BEGIN/COMMIT and records it applied", async () => {
    const dir = makeModule([
      {
        name: "Migration1_Concurrent",
        sql: 'CREATE INDEX CONCURRENTLY "idx_u" ON users (email);',
      },
    ]);
    const fake = makeFakePool();
    const tracker = new MigrationTracker(fake.pool);

    const result = await executeMigration(
      fake.pool,
      makeMigrationInfo(dir, "Migration1_Concurrent"),
      "user",
      tracker,
    );

    expect(result.success).toBe(true);
    const sqls = fake.clientQueries.map((q) => q.sql);
    // Autocommit path: no transaction wrapping, body issued directly.
    expect(sqls).not.toContain("BEGIN");
    expect(sqls).not.toContain("COMMIT");
    expect(sqls).toContain(
      'CREATE INDEX CONCURRENTLY "idx_u" ON users (email);',
    );
    expect(fake.releaseCount).toBe(1);
    expect(
      fake.poolQueries.some((q) =>
        /INSERT INTO "_damat_migration_logs"/.test(q.sql),
      ),
    ).toBe(true);
  });

  it("runs an ALTER TYPE ... ADD VALUE migration outside a transaction", async () => {
    const dir = makeModule([
      {
        name: "Migration1_Enum",
        sql: "ALTER TYPE mood ADD VALUE 'excited';",
      },
    ]);
    const fake = makeFakePool();
    const tracker = new MigrationTracker(fake.pool);

    const result = await executeMigration(
      fake.pool,
      makeMigrationInfo(dir, "Migration1_Enum"),
      "user",
      tracker,
    );

    expect(result.success).toBe(true);
    const sqls = fake.clientQueries.map((q) => q.sql);
    expect(sqls).toEqual(["ALTER TYPE mood ADD VALUE 'excited';"]);
  });

  it("does NOT issue ROLLBACK when a non-transactional migration fails", async () => {
    const dir = makeModule([
      {
        name: "Migration1_ConcurrentBad",
        sql: "CREATE INDEX CONCURRENTLY bad;",
      },
    ]);
    const fake = makeFakePool({
      failOn: (sql) => sql === "CREATE INDEX CONCURRENTLY bad;",
    });
    const tracker = new MigrationTracker(fake.pool);

    const result = await executeMigration(
      fake.pool,
      makeMigrationInfo(dir, "Migration1_ConcurrentBad"),
      "user",
      tracker,
    );

    expect(result.success).toBe(false);
    const sqls = fake.clientQueries.map((q) => q.sql);
    // No BEGIN means there's no open tx, so no ROLLBACK is attempted.
    expect(sqls).not.toContain("ROLLBACK");
    expect(sqls).not.toContain("BEGIN");
    // Nothing recorded as applied.
    expect(
      fake.poolQueries.some((q) =>
        /INSERT INTO "_damat_migration_logs"/.test(q.sql),
      ),
    ).toBe(false);
    expect(fake.releaseCount).toBe(1);
  });
});

describe("executeMigration — tracker failure after a successful COMMIT", () => {
  it("surfaces a recordApplied failure as a failed result even though COMMIT ran", async () => {
    const dir = makeModule([
      { name: "Migration1_Ok", sql: "CREATE TABLE t (id text);" },
    ]);
    const fake = makeFakePool({
      poolFailOn: (sql) => /INSERT INTO "_damat_migration_logs"/.test(sql),
    });
    const tracker = new MigrationTracker(fake.pool);

    const result = await executeMigration(
      fake.pool,
      makeMigrationInfo(dir, "Migration1_Ok"),
      "user",
      tracker,
    );

    // The SQL transaction itself committed...
    const sqls = fake.clientQueries.map((q) => q.sql);
    expect(sqls).toContain("COMMIT");
    expect(sqls).not.toContain("ROLLBACK");
    // ...but the tracker INSERT threw, so the overall result is a failure.
    expect(result.success).toBe(false);
    expect(result.error).toBeInstanceOf(Error);
    expect(result.error!.message).toContain("pool-boom");
  });
});
