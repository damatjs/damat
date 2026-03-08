/**
 * Migration Revert Operations
 *
 * Functions for reverting/undoing applied migrations.
 */

import type { MikroORM } from "@damatjs/deps/mikro-orm/core";
import { log } from "../logger";
import { discoverModuleMigrations } from "../discovery";
import { MigrationTracker } from "../tracker";
import { executeMigration } from "./migration";
import { ModuleMigrationResult } from "../../types";

/**
 * Revert migrations for a module.
 *
 * @param orm - MikroORM instance
 * @param modulesDir - Path to the modules directory
 * @param moduleName - Module to revert migrations for
 * @param count - Number of migrations to revert (default: 1)
 * @returns Migration result
 *
 * @example
 * ```typescript
 * // Revert last migration
 * const result = await revertMigrations(orm, './src/modules', 'user');
 *
 * // Revert last 3 migrations
 * const result = await revertMigrations(orm, './src/modules', 'user', 3);
 *
 * // Revert all migrations
 * const result = await revertMigrations(orm, './src/modules', 'user', 9999);
 * ```
 */
export async function revertMigrations(
  orm: MikroORM,
  modulesDir: string,
  moduleName: string,
  count: number = 1,
): Promise<ModuleMigrationResult> {
  const tracker = new MigrationTracker(orm);
  await tracker.ensureTable();

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

    // Get the most recent N applied migrations (in reverse order)
    const toRevert = applied.slice(-count).reverse();

    if (toRevert.length === 0) {
      log("info", `${moduleName}: No migrations to revert`);
      return result;
    }

    log("info", `${moduleName}: Reverting ${toRevert.length} migration(s)...`);

    for (const appliedMigration of toRevert) {
      const migrationFile = migrations.find(
        (m) => m.name === appliedMigration.name,
      );

      if (!migrationFile) {
        log(
          "warn",
          `  ${appliedMigration.name}: File not found, marking as reverted`,
        );
        await tracker.recordReverted(moduleName, appliedMigration.name);
        result.reverted.push(appliedMigration.name);
        continue;
      }

      const revertResult = await executeMigration(
        orm,
        migrationFile,
        moduleName,
        tracker,
        "down",
      );

      if (revertResult.success) {
        result.reverted.push(appliedMigration.name);
      } else {
        result.success = false;
        if (revertResult.error) {
          result.error = revertResult.error;
        }
        break;
      }
    }
  } catch (error) {
    result.success = false;
    result.error = error instanceof Error ? error : new Error(String(error));
    log("error", `${moduleName}: Revert failed`, result.error.message);
  }

  return result;
}
