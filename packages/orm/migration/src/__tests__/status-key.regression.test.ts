import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { runMigrations } from "../executor/run";
import {
  getMigrationStatus,
  getModuleMigrationStatus,
} from "../executor/status";

/**
 * Regression for the module-key mismatch (audit C12): migrate:up records
 * tracker rows keyed by module NAME while migrate:status used to filter by
 * the module's resolve PATH, so applied migrations were always reported as
 * pending.
 *
 * A stateful fake pg Pool persists the tracker INSERTs issued by the record
 * path and serves them back to the status path's SELECT — the exact
 * round-trip a real `_damat_migration_logs` table performs — with NO live
 * database, so this test can never silently skip.
 */

interface Row {
  module: string;
  name: string;
  applied_at: Date;
}

function makeStatefulPool() {
  const rows: Row[] = [];
  const pool = {
    query: async (sql: string, params?: unknown[]) => {
      if (/INSERT INTO "_damat_migration_logs"/.test(sql)) {
        rows.push({
          module: params![1] as string,
          name: params![2] as string,
          applied_at: new Date(),
        });
        return { rows: [], rowCount: 1 };
      }
      if (/status = 'applied'/.test(sql)) {
        const module = params?.[0] as string | undefined;
        const matched = module ? rows.filter((r) => r.module === module) : rows;
        return { rows: matched, rowCount: matched.length };
      }
      return { rows: [], rowCount: 0 };
    },
    connect: async () => ({
      query: async () => ({ rows: [], rowCount: 0 }),
      release: () => {},
    }),
  };
  return { pool: pool as any, rows };
}

let tmpRoot: string;

beforeEach(() => {
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "orm-mig-status-key-"));
});

afterEach(() => {
  fs.rmSync(tmpRoot, { recursive: true, force: true });
});

describe("status reads the same tracker key that up records", () => {
  it("reports migrations applied by runMigrations as applied, not pending", async () => {
    // name !== resolve path is the regression condition.
    const dir = path.join(tmpRoot, "modules", "user");
    fs.mkdirSync(path.join(dir, "migrations"), { recursive: true });
    for (const name of [
      "Migration20260101000000_Initial",
      "Migration20260201000000_AddEmail",
    ]) {
      fs.writeFileSync(
        path.join(dir, "migrations", `${name}.sql`),
        "SELECT 1;",
      );
    }
    const module = { id: "user", name: "user", path: dir, resolve: dir };
    const { pool, rows } = makeStatefulPool();

    const results = await runMigrations(pool, { user: module } as any);
    expect(results[0]!.applied).toHaveLength(2);
    // The record path persists the module NAME — never the resolve path.
    expect(rows.map((r) => r.module)).toEqual(["user", "user"]);

    const status = await getMigrationStatus(pool, { user: module } as any);
    expect(status.modules[0]!.name).toBe("user");
    expect(status.modules[0]!.applied).toBe(2);
    expect(status.modules[0]!.pending).toBe(0);
    expect(status.modules[0]!.migrations.every((m) => m.applied)).toBe(true);

    const single = await getModuleMigrationStatus(pool, module as any);
    expect(single.module.applied).toBe(2);
    expect(single.module.pending).toBe(0);
  });
});
