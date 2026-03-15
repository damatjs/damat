/**
 * Migration Revert Operations
 *
 * Functions for reverting/undoing applied migrations using pg Pool.
 */

import type { Pool } from "@damatjs/deps/pg";
import { log } from "../logger";
import { discoverModuleMigrations } from "../discovery";
import { MigrationTracker } from "../tracker";
import { executeMigration } from "./migration";
import type { ModuleMigrationResult } from "../types";

/**
 * Revert migrations for a module.
 *
 * @param pool       - pg connection pool
 * @param modulesDir - Path to the modules directory
 * @param moduleName - Module to revert migrations for
 * @param count      - Number of migrations to revert (default: 1)
 */
export async function revertMigrations(
  pool: Pool,
  modulesDir: string,
  moduleName: string,
  count: number = 1,
): Promise<ModuleMigrationResult> {
  const tracker = new MigrationTracker(pool);
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

    // Most-recent N migrations in reverse order
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
        pool,
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
