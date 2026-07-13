import { describe, it, expect } from "bun:test";
import { MigrationTracker } from "../tracker";
import type { AppliedMigration } from "../tracker";

/**
 * Edge-case coverage for MigrationTracker, complementing tracker.test.ts.
 *
 * Runs entirely against a fake pg Pool that records every query (SQL + params)
 * and returns caller-supplied canned rows. No real database is involved.
 */

interface RecordedQuery {
  sql: string;
  params?: unknown[];
}

function makeFakePool(
  rowsFor?: (sql: string, params?: unknown[]) => Record<string, unknown>[],
) {
  const queries: RecordedQuery[] = [];
  const pool = {
    query: async (sql: string, params?: unknown[]) => {
      queries.push({ sql, params });
      const rows = rowsFor ? rowsFor(sql, params) : [];
      return { rows, rowCount: rows.length };
    },
  };
  return { pool: pool as any, queries };
}

const norm = (sql: string) => sql.replace(/\s+/g, " ").trim();

describe("MigrationTracker.ensureTable — auto-create idempotency", () => {
  it("emits CREATE TABLE IF NOT EXISTS plus IF NOT EXISTS indexes (safe to re-run)", async () => {
    const { pool, queries } = makeFakePool();
    const tracker = new MigrationTracker(pool);

    // Calling twice must produce identical, idempotent DDL each time.
    await tracker.ensureTable();
    await tracker.ensureTable();

    expect(queries).toHaveLength(2);
    for (const q of queries) {
      const sql = norm(q.sql);
      expect(sql).toContain(
        'CREATE TABLE IF NOT EXISTS "_damat_migration_logs"',
      );
      expect(sql).toContain(
        'CREATE INDEX IF NOT EXISTS "idx__damat_migration_logs_module"',
      );
      expect(sql).toContain(
        'CREATE INDEX IF NOT EXISTS "idx__damat_migration_logs_status"',
      );
      // status defaults to 'applied' so freshly-inserted rows are visible.
      expect(sql).toContain("\"status\" TEXT NOT NULL DEFAULT 'applied'");
    }
    // Identical DDL both times (no per-call drift).
    expect(queries[0]!.sql).toBe(queries[1]!.sql);
  });
});

describe("MigrationTracker.recordApplied — UPSERT idempotency", () => {
  it("applying the same migration twice keeps the same id (ON CONFLICT path)", async () => {
    const { pool, queries } = makeFakePool();
    const tracker = new MigrationTracker(pool);

    await tracker.recordApplied("user", "Migration1_Initial", 100);
    await tracker.recordApplied("user", "Migration1_Initial", 250);

    expect(queries).toHaveLength(2);
    // Same id both times => the UNIQUE(module, name) conflict path is exercised.
    expect(queries[0]!.params?.[0]).toBe("4_user_Migration1_Initial");
    expect(queries[1]!.params?.[0]).toBe("4_user_Migration1_Initial");
    // The second call carries the new execution time (used by DO UPDATE SET).
    expect(queries[1]!.params?.[3]).toBe(250);
    const sql = norm(queries[1]!.sql);
    expect(sql).toContain("ON CONFLICT (module, name) DO UPDATE SET");
    // On re-apply, reverted_at is cleared and status forced back to 'applied'.
    expect(sql).toContain("reverted_at = NULL");
    expect(sql).toContain("status = 'applied'");
  });

  it("distinct module+name pairs produce distinct ids", async () => {
    const { pool, queries } = makeFakePool();
    const tracker = new MigrationTracker(pool);

    await tracker.recordApplied("user", "Migration1_Initial", 10);
    await tracker.recordApplied("billing", "Migration1_Initial", 10);
    await tracker.recordApplied("user", "Migration2_AddEmail", 10);

    expect(queries.map((q) => q.params?.[0])).toEqual([
      "4_user_Migration1_Initial",
      "7_billing_Migration1_Initial",
      "4_user_Migration2_AddEmail",
    ]);
  });

  it("colliding (module, name) pairs still produce distinct ids (a_b/c vs a/b_c)", async () => {
    const { pool, queries } = makeFakePool();
    const tracker = new MigrationTracker(pool);

    // A plain `${module}_${name}` join would make both `a_b_c`.
    await tracker.recordApplied("a_b", "c", 1);
    await tracker.recordApplied("a", "b_c", 1);

    expect(queries[0]!.params?.[0]).toBe("3_a_b_c");
    expect(queries[1]!.params?.[0]).toBe("1_a_b_c");
    expect(queries[0]!.params?.[0]).not.toBe(queries[1]!.params?.[0]);
  });

  it("passes a zero execution time through unchanged", async () => {
    const { pool, queries } = makeFakePool();
    await new MigrationTracker(pool).recordApplied("user", "M1", 0);
    expect(queries[0]!.params?.[3]).toBe(0);
  });
});

describe("MigrationTracker round-trip: record then read", () => {
  it("getApplied returns only rows the fake DB reports as applied for the module", async () => {
    const recorded: Record<string, AppliedMigration[]> = {};

    const { pool } = makeFakePool((sql, params) => {
      if (/INSERT INTO/.test(sql)) {
        const [, mod, name] = params as [string, string, string, number];
        (recorded[mod] ??= []).push({
          module: mod,
          name,
          applied_at: new Date("2026-01-01"),
        });
        return [];
      }
      if (/SELECT/.test(sql) && /status = 'applied'/.test(sql)) {
        const mod = params?.[0] as string | undefined;
        if (mod) return recorded[mod] ?? [];
        return Object.values(recorded).flat();
      }
      return [];
    });

    const tracker = new MigrationTracker(pool);
    await tracker.recordApplied("user", "Migration1_Initial", 5);
    await tracker.recordApplied("user", "Migration2_AddEmail", 5);
    await tracker.recordApplied("billing", "Migration1_Invoices", 5);

    const userApplied = await tracker.getApplied("user");
    expect(userApplied.map((r) => r.name)).toEqual([
      "Migration1_Initial",
      "Migration2_AddEmail",
    ]);

    const all = await tracker.getApplied();
    expect(all).toHaveLength(3);
  });

  it("getApplied returns [] for a module with nothing recorded", async () => {
    const { pool } = makeFakePool(() => []);
    const result = await new MigrationTracker(pool).getApplied("ghost");
    expect(result).toEqual([]);
  });
});

describe("MigrationTracker.recordReverted then re-apply", () => {
  it("recordReverted keys off (module, name); a subsequent recordApplied re-upserts", async () => {
    const { pool, queries } = makeFakePool();
    const tracker = new MigrationTracker(pool);

    await tracker.recordApplied("user", "Migration1_Initial", 10);
    await tracker.recordReverted("user", "Migration1_Initial");
    await tracker.recordApplied("user", "Migration1_Initial", 20);

    // apply/re-apply carry the length-prefixed id; revert keys off (module, name).
    expect(queries[0]!.params?.[0]).toBe("4_user_Migration1_Initial"); // apply
    expect(queries[1]!.params).toEqual(["user", "Migration1_Initial"]); // revert
    expect(queries[2]!.params?.[0]).toBe("4_user_Migration1_Initial"); // re-apply
    expect(norm(queries[1]!.sql)).toContain("status = 'reverted'");
    expect(norm(queries[2]!.sql)).toContain(
      "ON CONFLICT (module, name) DO UPDATE SET",
    );
  });
});
