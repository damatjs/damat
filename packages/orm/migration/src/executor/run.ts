/**
 * Migration Run Operations
 *
 * Functions for running/applying pending migrations using pg Pool.
 */

import type { Pool } from "@damatjs/deps/pg";
import type { ModuleMigrationResult } from "../types";
import { log } from "../logger";
import {
  discoverModuleMigrations,
  listModulesWithMigrations,
} from "../discovery";
import { MigrationTracker } from "../tracker";
import { executeMigration } from "./migration";

/**
 * Run pending migrations for a module or all modules.
 *
 * @param pool         - pg connection pool
 * @param modulesDir   - Path to the modules directory
 * @param activeModules - List of active module names
 * @param moduleName   - Optional specific module to run migrations for
 */
export async function runMigrations(
  pool: Pool,
  modulesDir: string,
  modules?: string[],
  moduleName?: string,
): Promise<ModuleMigrationResult[]> {
  const tracker = new MigrationTracker(pool);
  await tracker.ensureTable();

  const results: ModuleMigrationResult[] = [];
  const modulesData = moduleName
    ? [moduleName]
    : listModulesWithMigrations(modulesDir, modules);

  for (const mod of modulesData) {
    const result = await runModuleMigrations(pool, modulesDir, mod, tracker);
    results.push(result);
  }

  return results;
}

/**
 * Run migrations for a single module.
 */
async function runModuleMigrations(
  pool: Pool,
  modulesDir: string,
  moduleName: string,
  tracker: MigrationTracker,
): Promise<ModuleMigrationResult> {
  const result: ModuleMigrationResult = {
    success: true,
    module: moduleName,
    applied: [],
    reverted: [],
    pending: [],
  };

  try {
    const migrations = discoverModuleMigrations(modulesDir, moduleName);
    const applied = await tracker.getApplied(moduleName);
    const appliedNames = new Set(applied.map((a) => a.name));

    const pending = migrations.filter((m) => !appliedNames.has(m.name));
    result.pending = pending.map((m) => m.name);

    if (pending.length === 0) {
      log("skip", `${moduleName}: No pending migrations`);
      return result;
    }

    log("info", `${moduleName}: Running ${pending.length} migration(s)...`);

    for (const migration of pending) {
      const migrationResult = await executeMigration(
        pool,
        migration,
        moduleName,
        tracker,
        "up",
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
    log("error", `${moduleName}: Migration failed`, result.error.message);
  }

  return result;
}
