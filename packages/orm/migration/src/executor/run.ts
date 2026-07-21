/**
 * Migration Run Operations
 *
 * Functions for running/applying pending migrations using pg Pool.
 */

import type { Pool } from "@damatjs/deps/pg";
import type { ModuleMigrationResult } from "../types";
import { MigrationTracker } from "../tracker";
import { bootstrapDatabase } from "./bootstrap";
import { OrmModuleContainer } from "@damatjs/orm-type";
import { runModuleMigrations } from "./moduleRun";
import { type MigrationRunOptions, runSystemMigrations } from "../system/run";

/**
 * Arbitrary-but-stable app-level advisory lock key so concurrent deploys
 * running migrations against the same database serialize instead of racing.
 */
const MIGRATION_LOCK_KEY = "8123946152146164013";

/**
 * Run pending migrations for every module in the container.
 *
 * @param pool            - pg connection pool
 * @param moduleResolvers - Modules keyed by id; migrations are discovered via
 *                          `resolve` and tracked under the module `name`
 */
export async function runMigrations(
  pool: Pool,
  moduleResolvers: OrmModuleContainer,
  options: MigrationRunOptions = {},
): Promise<ModuleMigrationResult[]> {
  // The lock lives on a dedicated session so Postgres auto-releases it if
  // this process dies mid-run; it must be taken before ensureTable so even
  // tracker-table creation is serialized.
  const lockClient = await pool.connect();
  try {
    await lockClient.query(`SELECT pg_advisory_lock(${MIGRATION_LOCK_KEY})`);

    const tracker = new MigrationTracker(pool);
    await tracker.ensureTable();
    await bootstrapDatabase(pool);

    const results = await runSystemMigrations(
      pool,
      options.systemMigrations ?? [],
      tracker,
    );
    if (results.some((result) => !result.success)) return results;
    for (const moduleResolver of Object.values(moduleResolvers)) {
      results.push(await runModuleMigrations(pool, moduleResolver, tracker));
    }

    return results;
  } finally {
    try {
      await lockClient.query(
        `SELECT pg_advisory_unlock(${MIGRATION_LOCK_KEY})`,
      );
    } catch {
      // Session teardown below releases the lock regardless.
    }
    lockClient.release();
  }
}
