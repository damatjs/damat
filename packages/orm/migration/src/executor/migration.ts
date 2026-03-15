/**
 * Migration Execution Operations
 *
 * Unified function for running or reverting a single migration using pg Pool.
 */

import type { Pool } from "@damatjs/deps/pg";
import { log } from "../logger";
import { MigrationTracker } from "../tracker";
import type { MigrationInfo, MigrationDirection } from "../types";

/**
 * Execute a single migration in the specified direction.
 *
 * The migration file is expected to export a class with `up()` and `down()`
 * methods that call `this.addSql(sql)` to register SQL statements.
 */
export async function executeMigration(
  pool: Pool,
  migration: MigrationInfo,
  moduleName: string,
  tracker: MigrationTracker,
  direction: MigrationDirection,
): Promise<{ success: boolean; error?: Error }> {
  const startTime = Date.now();
  const isUp = direction === "up";

  try {
    // Dynamically import the migration file
    const migrationModule = await import(migration.path);
    const MigrationClass =
      migrationModule[migration.name] ??
      (Object.values(migrationModule)[0] as new () => {
        up: () => Promise<void>;
        down: () => Promise<void>;
        _queries: string[];
      });

    // Instantiate and run in the specified direction
    const instance = new MigrationClass();
    await instance[direction]();

    // Execute collected SQL statements inside a transaction
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      for (const sql of instance._queries ?? []) {
        await client.query(sql);
      }
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }

    // Track result
    if (isUp) {
      const executionTime = Date.now() - startTime;
      await tracker.recordApplied(moduleName, migration.name, executionTime);
      log("success", `  Applied: ${migration.name}`, `(${executionTime}ms)`);
    } else {
      await tracker.recordReverted(moduleName, migration.name);
      log("success", `  Reverted: ${migration.name}`);
    }

    return { success: true };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    const action = isUp ? "apply" : "revert";
    log("error", `  Failed to ${action}: ${migration.name}`, err.message);
    return { success: false, error: err };
  }
}
