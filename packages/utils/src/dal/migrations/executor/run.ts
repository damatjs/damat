/**
 * Migration Run Operations
 *
 * Functions for running/applying pending migrations.
 */

import type { MikroORM } from "@damatjs/deps/mikro-orm/core";
import type { ModuleMigrationResult } from "../../types";
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
 * @param orm - MikroORM instance
 * @param modulesDir - Path to the modules directory
 * @param activeModules - List of active module names
 * @param moduleName - Optional specific module to run migrations for
 * @returns Array of migration results for each module
 *
 * @example
 * ```typescript
 * // Run all pending migrations
 * const results = await runMigrations(orm, './src/modules', ['user', 'billing']);
 *
 * // Run migrations for specific module
 * const results = await runMigrations(orm, './src/modules', ['user'], 'user');
 * ```
 */
export async function runMigrations(
  orm: MikroORM,
  modulesDir: string,
  activeModules: string[],
  moduleName?: string,
): Promise<ModuleMigrationResult[]> {
  const tracker = new MigrationTracker(orm);
  await tracker.ensureTable();

  const results: ModuleMigrationResult[] = [];
  const modules = moduleName
    ? [moduleName]
    : listModulesWithMigrations(modulesDir, activeModules);

  for (const mod of modules) {
    const result = await runModuleMigrations(orm, modulesDir, mod, tracker);
    results.push(result);
  }

  return results;
}

/**
 * Run migrations for a single module.
 */
async function runModuleMigrations(
  orm: MikroORM,
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

    // Find pending migrations
    const pending = migrations.filter((m) => !appliedNames.has(m.name));
    result.pending = pending.map((m) => m.name);

    if (pending.length === 0) {
      log("skip", `${moduleName}: No pending migrations`);
      return result;
    }

    log("info", `${moduleName}: Running ${pending.length} migration(s)...`);

    // Run each pending migration
    for (const migration of pending) {
      const migrationResult = await executeMigration(
        orm,
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
