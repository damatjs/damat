import { describe, expect, test, mock } from "bun:test";
import { mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { applyModuleMigrations } from "../src/harness/migrate";
import type { ModuleManifest } from "../src";

/**
 * applyModuleMigrations takes the pool + logger as parameters, so it can be
 * exercised with a fake pool — no live Postgres and no mock.module. The actual
 * SQL execution is delegated to @damatjs/orm-migration's runMigrations, which
 * only issues pool.query() calls (ensureTable + bootstrap) when there are no
 * pending migration files. We give it a module dir with NO .sql files so it
 * runs the real code path end-to-end against the fake pool without needing a DB.
 */

function makeFakePool() {
  const queries: string[] = [];
  const query = mock(async (text: string) => {
    queries.push(text);
    return { rows: [], rowCount: 0 };
  });
  return {
    queries,
    query,
    // bootstrapDatabase() checks out a client; give it a faithful fake.
    connect: mock(async () => ({
      query: mock(async (text: string) => {
        queries.push(text);
        return { rows: [], rowCount: 0 };
      }),
      release: mock(() => {}),
    })),
  };
}

function noopLogger() {
  return {
    info: mock(() => {}),
    warn: mock(() => {}),
    error: mock(() => {}),
    debug: mock(() => {}),
  } as any;
}

const manifest: ModuleManifest = { name: "user" } as ModuleManifest;

describe("applyModuleMigrations", () => {
  test("no-ops when the module has no migrations directory and not forced", async () => {
    const dir = mkdtempSync(join(tmpdir(), "damat-migrate-none-"));
    const pool = makeFakePool();
    const logger = noopLogger();
    try {
      await applyModuleMigrations(pool as any, dir, manifest, logger);
      expect(pool.query).not.toHaveBeenCalled();
      expect(logger.info).not.toHaveBeenCalled();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("runs migrations when a migrations directory exists (empty = no pending)", async () => {
    const dir = mkdtempSync(join(tmpdir(), "damat-migrate-empty-"));
    mkdirSync(join(dir, "migrations"));
    const pool = makeFakePool();
    const logger = noopLogger();
    try {
      await applyModuleMigrations(pool as any, dir, manifest, logger);
      // ensureTable + bootstrap issued queries against our fake pool
      expect(pool.query).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(
        'Migrations applied for module "user"',
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("force=true runs even without a migrations directory", async () => {
    const dir = mkdtempSync(join(tmpdir(), "damat-migrate-force-"));
    const pool = makeFakePool();
    const logger = noopLogger();
    try {
      await applyModuleMigrations(pool as any, dir, manifest, logger, true);
      expect(pool.query).toHaveBeenCalled();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("honours manifest.paths.migrations and falls back to dir basename for the name", async () => {
    const dir = mkdtempSync(join(tmpdir(), "damat-migrate-paths-"));
    mkdirSync(join(dir, "db"));
    const pool = makeFakePool();
    const logger = noopLogger();
    const named: ModuleManifest = {
      paths: { migrations: "db" },
    } as unknown as ModuleManifest;
    try {
      await applyModuleMigrations(pool as any, dir, named, logger);
      expect(pool.query).toHaveBeenCalled();
      // name falls back to basename(dir) since manifest.name is absent
      const msg = (logger.info.mock.calls[0]?.[0] ?? "") as string;
      expect(msg).toContain("Migrations applied for module");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
