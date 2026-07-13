import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { runMigrations } from "../executor/run";

/**
 * Coverage for runModuleMigrations' catch block: when discovery / tracker work
 * inside the per-module try throws, the module result must be marked failed with
 * the surfaced error rather than the whole run rejecting.
 *
 * Uses the same fake pg Pool pattern as executor.test.ts. Here the pool's
 * top-level query() throws specifically on the getApplied() SELECT, so
 * runModuleMigrations enters its catch. Migration files live in os.tmpdir().
 */

interface FakePoolOptions {
  poolFailOn?: (sql: string) => boolean;
}

function makeFakePool(opts: FakePoolOptions = {}) {
  const pool = {
    query: async (sql: string, _params?: unknown[]) => {
      if (opts.poolFailOn?.(sql)) {
        throw new Error("pool-boom: " + sql.slice(0, 20));
      }
      return { rows: [], rowCount: 0 };
    },
    connect: async () => ({
      query: async () => ({ rows: [], rowCount: 0 }),
      release: () => {},
    }),
  };
  return { pool: pool as any };
}

let tmpRoot: string;
let moduleCounter = 0;

function makeModule(files: { name: string }[]): { dir: string; name: string } {
  const name = `module_${moduleCounter}`;
  const dir = path.join(tmpRoot, `mod_${moduleCounter++}`);
  const migrationsDir = path.join(dir, "migrations");
  fs.mkdirSync(migrationsDir, { recursive: true });
  for (const f of files) {
    fs.writeFileSync(
      path.join(migrationsDir, `${f.name}.sql`),
      `-- ${f.name}\nSELECT 1;`,
    );
  }
  return { dir, name };
}

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
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "orm-mig-run-cov-"));
});

afterEach(() => {
  fs.rmSync(tmpRoot, { recursive: true, force: true });
});

describe("runMigrations — per-module failure is caught", () => {
  it("marks the module failed and surfaces the error when getApplied throws", async () => {
    const mod = makeModule([{ name: "Migration20260101000000_Initial" }]);
    // ensureTable / bootstrap succeed; only the applied-status SELECT throws.
    const fake = makeFakePool({
      poolFailOn: (sql) => /status = 'applied'/.test(sql),
    });

    const results = await runMigrations(fake.pool, container([mod]) as any);

    expect(results).toHaveLength(1);
    expect(results[0]!.success).toBe(false);
    expect(results[0]!.error).toBeInstanceOf(Error);
    expect(results[0]!.error!.message).toContain("pool-boom");
    // No migrations applied because discovery/tracker failed before execution.
    expect(results[0]!.applied).toEqual([]);
  });

  it("wraps a non-Error throw into an Error in the result", async () => {
    const mod = makeModule([{ name: "Migration20260101000000_Initial" }]);
    const pool = {
      query: async (sql: string) => {
        if (/status = 'applied'/.test(sql)) {
          // Throw a non-Error value to exercise the String(error) branch.
          throw "plain string failure";
        }
        return { rows: [], rowCount: 0 };
      },
      connect: async () => ({
        query: async () => ({ rows: [], rowCount: 0 }),
        release: () => {},
      }),
    };

    const results = await runMigrations(pool as any, container([mod]) as any);

    expect(results[0]!.success).toBe(false);
    expect(results[0]!.error).toBeInstanceOf(Error);
    expect(results[0]!.error!.message).toContain("plain string failure");
  });
});
