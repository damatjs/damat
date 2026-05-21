/**
 * Migration Execution Operations
 *
 * Unified function for running a single SQL migration using pg Pool.
 */

import fs from "node:fs";
import type { Pool } from "@damatjs/deps/pg";
import { log } from "../logger";
import { MigrationTracker } from "../tracker";
import type { MigrationInfo } from "../types";

/**
 * Execute a single .sql migration file.
 */
export async function executeMigration(
  pool: Pool,
  migration: MigrationInfo,
  moduleName: string,
  tracker: MigrationTracker,
): Promise<{ success: boolean; error?: Error }> {
  const startTime = Date.now();

  try {
    // Read the raw SQL from the migration file
    const sql = fs.readFileSync(migration.path, "utf-8");

    // Execute the SQL inside a transaction 
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Basic split by semicolon to run statements sequentially if necessary
      // But passing the whole string to postgres usually works fine in one go
      // as long as there are no mixed transactional commands.
      await client.query(sql);

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }

    // Track result
    const executionTime = Date.now() - startTime;
    await tracker.recordApplied(moduleName, migration.name, executionTime);
    log("success", `  Applied: ${migration.name}`, `(${executionTime}ms)`);

    return { success: true };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    log("error", `  Failed to apply: ${migration.name}`, err.message);
    return { success: false, error: err };
  }
}
