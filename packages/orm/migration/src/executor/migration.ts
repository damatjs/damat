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
 * Statements Postgres forbids inside a transaction block. A migration body
 * containing one must run WITHOUT the wrapping BEGIN/COMMIT (each statement
 * then autocommits), otherwise pg raises an opaque "cannot run inside a
 * transaction block" error at runtime.
 */
const NON_TRANSACTIONAL = [
  /\bCREATE\s+INDEX\s+CONCURRENTLY\b/i,
  /\bDROP\s+INDEX\s+CONCURRENTLY\b/i,
  /\bREINDEX\b[\s\S]*?\bCONCURRENTLY\b/i,
  /\bALTER\s+TYPE\b[\s\S]*?\bADD\s+VALUE\b/i,
];

/** Return the offending construct if the SQL can't run in a transaction. */
function nonTransactionalConstruct(sql: string): string | undefined {
  for (const re of NON_TRANSACTIONAL) {
    const match = re.exec(sql);
    if (match) return match[0].replace(/\s+/g, " ");
  }
  return undefined;
}

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
    const offending = nonTransactionalConstruct(sql);

    const client = await pool.connect();
    try {
      if (offending) {
        // Can't be wrapped in BEGIN/COMMIT; pg autocommits each statement.
        log(
          "info",
          `Running ${migration.name} outside a transaction`,
          `(${offending})`,
        );
        await client.query(sql);
      } else {
        await client.query("BEGIN");
        await client.query(sql);
        await client.query("COMMIT");
      }
    } catch (err) {
      // Only the transactional path has an open tx to roll back.
      if (!offending) {
        try {
          await client.query("ROLLBACK");
        } catch {
          // A failed ROLLBACK must not mask the original migration error;
          // the connection is released below and pg discards the aborted tx.
        }
      }
      throw err;
    } finally {
      client.release();
    }

    // Track result
    const executionTime = Date.now() - startTime;
    await tracker.recordApplied(moduleName, migration.name, executionTime);
    log("success", `Applied: ${migration.name}`, `(${executionTime}ms)`);

    return { success: true };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    log("error", `  Failed to apply: ${migration.name}`, err.message);
    return { success: false, error: err };
  }
}
