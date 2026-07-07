/**
 * Migration Run Operations
 *
 * Functions for running/applying pending migrations using pg Pool.
 */

import type { Pool } from "@damatjs/deps/pg";
import type { ModuleMigrationResult } from "../types";
import { log } from "../logger";
import { discoverModuleMigrations } from "../discovery";
import { MigrationTracker } from "../tracker";
import { executeMigration } from "./migration";
import { bootstrapDatabase } from "./bootstrap";
import { OrmModuleContainer, OrmModule } from "@damatjs/orm-type";

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

    const results: ModuleMigrationResult[] = [];
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

/**
 * Run migrations for a single module.
 */
async function runModuleMigrations(
  pool: Pool,
  moduleResolver: OrmModule,
  tracker: MigrationTracker,
): Promise<ModuleMigrationResult> {
  const result: ModuleMigrationResult = {
    success: true,
    applied: [],
    pending: [],
  };
  try {
    const migrations = discoverModuleMigrations(moduleResolver.resolve);
    const applied = await tracker.getApplied(moduleResolver.name);
    const appliedNames = new Set(applied.map((a) => a.name));

    const pending = migrations.filter((m) => !appliedNames.has(m.name));
    result.pending = pending.map((m) => m.name);

    if (pending.length === 0) {
      log("skip", `${moduleResolver.name}: No pending migrations`);
      return result;
    }

    log(
      "info",
      `${moduleResolver.name}: Running ${pending.length} migration(s)...`,
    );

    for (const migration of pending) {
      const migrationResult = await executeMigration(
        pool,
        migration,
        moduleResolver.name,
        tracker,
      );

      if (migrationResult.success) {
        result.applied.push(migration.name);
      } else {
        result.success = false;
        if (migrationResult.error) {
          result.error = migrationResult.error;
        }
        break;
      }
    }
  } catch (error) {
    result.success = false;
    result.error = error instanceof Error ? error : new Error(String(error));
    log(
      "error",
      `${moduleResolver.name}: Migration failed`,
      result.error.message,
    );
  }

  return result;
}
