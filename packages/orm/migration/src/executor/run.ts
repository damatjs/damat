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

/**
 * Run pending migrations for all or specific modules.
 *
 * @param pool          - pg connection pool
 * @param modulesDir    - Path to the modules directory
 * @param activeModules - Optional allowlist of module names (empty/omitted = all discovered)
 * @param moduleName    - Optional single module to target
 */
export async function runMigrations(
  pool: Pool,
  moduleResolvers: string[],
): Promise<ModuleMigrationResult[]> {
  const tracker = new MigrationTracker(pool);
  await tracker.ensureTable();
  await bootstrapDatabase(pool);


  const results: ModuleMigrationResult[] = [];
  for (const moduleResolver of moduleResolvers) {
    results.push(await runModuleMigrations(pool, moduleResolver, tracker));
  }

  return results;
}

/**
 * Run migrations for a single module.
 */
async function runModuleMigrations(
  pool: Pool,
  moduleResolver: string,
  tracker: MigrationTracker,
): Promise<ModuleMigrationResult> {
  const result: ModuleMigrationResult = {
    success: true,
    applied: [],
    pending: [],
  };
  try {
    const migrations = discoverModuleMigrations(moduleResolver);
    const applied = await tracker.getApplied(moduleResolver);
    const appliedNames = new Set(applied.map((a) => a.name));

    const pending = migrations.filter((m) => !appliedNames.has(m.name));
    result.pending = pending.map((m) => m.name);

    if (pending.length === 0) {
      log("skip", `${moduleResolver}: No pending migrations`);
      return result;
    }

    log("info", `${moduleResolver}: Running ${pending.length} migration(s)...`);

    for (const migration of pending) {
      const migrationResult = await executeMigration(
        pool,
        migration,
        moduleResolver,
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
    log("error", `${moduleResolver}: Migration failed`, result.error.message);
  }

  return result;
}
