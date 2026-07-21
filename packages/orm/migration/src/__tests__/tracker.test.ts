import { describe, it, expect } from "bun:test";
import { MigrationTracker } from "../tracker";
import type { AppliedMigration } from "../tracker";

/**
 * Tracker tests run entirely against a fake pg Pool that records every query
 * (SQL text + params) and returns canned rows. No real database is involved.
 */

interface RecordedQuery {
  sql: string;
  params?: unknown[];
}

function makeFakePool(rows: Record<string, unknown>[] = []) {
  const queries: RecordedQuery[] = [];
  const pool = {
    query: async (sql: string, params?: unknown[]) => {
      queries.push({ sql, params });
      return { rows, rowCount: rows.length };
    },
  };
  return { pool: pool as any, queries };
}

/** Collapse runs of whitespace so multi-line SQL is easy to assert on. */
const norm = (sql: string) => sql.replace(/\s+/g, " ").trim();

describe("MigrationTracker.ensureTable", () => {
  it("issues a single CREATE TABLE IF NOT EXISTS for the tracking table", async () => {
    const { pool, queries } = makeFakePool();
    await new MigrationTracker(pool).ensureTable();

    expect(queries).toHaveLength(1);
    const sql = norm(queries[0]!.sql);
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS "_damat_migration_logs"');
    // Key columns and the uniqueness guard.
    expect(sql).toContain('"id" TEXT PRIMARY KEY');
    expect(sql).toContain('UNIQUE ("module", "name")');
    // Supporting indexes are created idempotently.
    expect(sql).toContain(
      'CREATE INDEX IF NOT EXISTS "idx__damat_migration_logs_module"',
    );
    expect(sql).toContain(
      'CREATE INDEX IF NOT EXISTS "idx__damat_migration_logs_status"',
    );
  });
});

describe("MigrationTracker.getApplied", () => {
  it("filters by module with status='applied' and oldest-first ordering", async () => {
    const canned: AppliedMigration[] = [
      {
        module: "user",
        name: "Migration1_Initial",
        applied_at: new Date("2026-01-01"),
      },
    ];
    const { pool, queries } = makeFakePool(canned as any);

    const result = await new MigrationTracker(pool).getApplied("user");

    expect(result).toEqual(canned);
    expect(queries).toHaveLength(1);
    const sql = norm(queries[0]!.sql);
    expect(sql).toContain("WHERE status = 'applied' AND module = $1");
    expect(sql).toContain("ORDER BY applied_at ASC");
    expect(queries[0]!.params).toEqual(["user"]);
  });

  it("queries all modules (no params) when moduleName is omitted", async () => {
    const { pool, queries } = makeFakePool([]);
    const result = await new MigrationTracker(pool).getApplied();

    expect(result).toEqual([]);
    const sql = norm(queries[0]!.sql);
    expect(sql).toContain("WHERE status = 'applied'");
    expect(sql).not.toContain("module = $1");
    expect(queries[0]!.params).toBeUndefined();
  });
});

describe("MigrationTracker.recordApplied", () => {
  it("UPSERTs on UNIQUE(module, name) with a collision-free id and the execution time", async () => {
    const { pool, queries } = makeFakePool();
    await new MigrationTracker(pool).recordApplied(
      "user",
      "Migration1_Initial",
      150,
    );

    expect(queries).toHaveLength(1);
    const sql = norm(queries[0]!.sql);
    expect(sql).toContain('INSERT INTO "_damat_migration_logs"');
    // Conflict targets the unique constraint, not the synthetic id.
    expect(sql).toContain("ON CONFLICT (module, name) DO UPDATE SET");
    expect(sql).toContain("status = 'applied'");
    // id is length-prefixed (`${module.length}_${module}_${name}`) so
    // colliding (module, name) pairs can never share an id.
    expect(queries[0]!.params).toEqual([
      "4_user_Migration1_Initial",
      "user",
      "Migration1_Initial",
      150,
    ]);
  });
});

describe("MigrationTracker.recordReverted", () => {
  it("marks the row reverted by (module, name)", async () => {
    const { pool, queries } = makeFakePool();
    await new MigrationTracker(pool).recordReverted(
      "user",
      "Migration1_Initial",
    );

    const sql = norm(queries[0]!.sql);
    expect(sql).toContain('UPDATE "_damat_migration_logs"');
    expect(sql).toContain("status = 'reverted'");
    expect(sql).toContain("WHERE module = $1 AND name = $2");
    expect(queries[0]!.params).toEqual(["user", "Migration1_Initial"]);
  });
});
