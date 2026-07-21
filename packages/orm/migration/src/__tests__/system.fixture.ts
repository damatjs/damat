import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export function createSystemMigrationPool(failSql?: string) {
  const sql: string[] = [];
  const inserts: unknown[][] = [];
  const applied = new Map<string, Set<string>>();
  let trackerFailure = false;
  const query = async (statement: string, params?: unknown[]) => {
    if (/status = 'applied'/.test(statement)) {
      const owner = String(params?.[0] ?? "");
      const rows = [...(applied.get(owner) ?? [])].map((name) => ({
        module: owner,
        name,
        applied_at: new Date(),
      }));
      return { rows, rowCount: rows.length };
    }
    if (/INSERT INTO "_damat_migration_logs"/.test(statement)) {
      if (trackerFailure) throw new Error("tracker failed");
      const owner = String(params?.[1]);
      const id = String(params?.[2]);
      applied.set(owner, new Set([...(applied.get(owner) ?? []), id]));
      inserts.push(params ?? []);
    }
    return { rows: [], rowCount: 0 };
  };
  const pool = {
    query,
    connect: async () => ({
      query: async (statement: string, params?: unknown[]) => {
        sql.push(statement);
        if (statement === failSql) throw new Error("system failed");
        if (/INSERT INTO "_damat_migration_logs"/.test(statement)) {
          return query(statement, params);
        }
        return { rows: [], rowCount: 0 };
      },
      release: () => undefined,
    }),
  };
  return {
    pool: pool as never,
    sql,
    inserts,
    applied,
    failTracker: (value: boolean) => {
      trackerFailure = value;
    },
  };
}

export function createModule(sql: string) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "system-migration-"));
  const migrations = path.join(root, "migrations");
  fs.mkdirSync(migrations);
  fs.writeFileSync(
    path.join(migrations, "Migration20260101000000_Module.sql"),
    sql,
  );
  return {
    cleanup: () => fs.rmSync(root, { recursive: true, force: true }),
    modules: {
      example: {
        id: "example",
        name: "example",
        path: root,
        resolve: root,
      },
    },
  };
}
