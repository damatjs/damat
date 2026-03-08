/**
 * Migration Tracker
 *
 * Manages the migration tracking table in the database.
 */

import type { MikroORM } from "@damatjs/deps/mikro-orm/core";

/** Name of the migration tracking table */
const TABLE_NAME = "_module_migrations";

/**
 * Record of an applied migration from the database.
 */
export interface AppliedMigration {
  module: string;
  name: string;
  applied_at: Date;
}

/**
 * Migration tracking table operations.
 *
 * Manages a `_module_migrations` table to track which migrations
 * have been applied and reverted for each module.
 *
 * @example
 * ```typescript
 * const tracker = new MigrationTracker(orm);
 * await tracker.ensureTable();
 *
 * // Get applied migrations
 * const applied = await tracker.getApplied('user');
 *
 * // Record a migration
 * await tracker.recordApplied('user', 'Migration20260211_Initial', 150);
 *
 * // Mark as reverted
 * await tracker.recordReverted('user', 'Migration20260211_Initial');
 * ```
 */
export class MigrationTracker {
  private orm: MikroORM;
  private tableName = TABLE_NAME;

  constructor(orm: MikroORM) {
    this.orm = orm;
  }

  /**
   * Ensure the migration tracking table exists.
   * Creates the table and indexes if they don't exist.
   */
  async ensureTable(): Promise<void> {
    const connection = this.orm.em.getConnection();

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS "${this.tableName}" (
        "id" TEXT PRIMARY KEY,
        "module" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "applied_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "reverted_at" TIMESTAMPTZ,
        "execution_time_ms" INTEGER,
        "status" TEXT NOT NULL DEFAULT 'applied',
        UNIQUE("module", "name")
      );
      
      CREATE INDEX IF NOT EXISTS "idx_${this.tableName}_module" ON "${this.tableName}"("module");
      CREATE INDEX IF NOT EXISTS "idx_${this.tableName}_status" ON "${this.tableName}"("status");
    `);
  }

  /**
   * Get applied migrations for a module (or all modules).
   *
   * @param moduleName - Optional module name to filter by
   * @returns Array of applied migration records
   */
  async getApplied(moduleName?: string): Promise<AppliedMigration[]> {
    const connection = this.orm.em.getConnection();
    let sql = `SELECT module, name, applied_at FROM "${this.tableName}" WHERE status = 'applied'`;
    const params: string[] = [];

    if (moduleName) {
      sql += ` AND module = $1`;
      params.push(moduleName);
    }

    sql += ` ORDER BY applied_at ASC`;

    const result = await connection.execute(sql, params);
    return result as AppliedMigration[];
  }

  /**
   * Record a migration as applied.
   *
   * @param module - Module name
   * @param name - Migration name
   * @param executionTimeMs - Execution time in milliseconds
   */
  async recordApplied(
    module: string,
    name: string,
    executionTimeMs: number,
  ): Promise<void> {
    const connection = this.orm.em.getConnection();
    const id = `${module}_${name}`;

    await connection.execute(
      `
      INSERT INTO "${this.tableName}" (id, module, name, execution_time_ms, status)
      VALUES ($1, $2, $3, $4, 'applied')
      ON CONFLICT (id) DO UPDATE SET
        applied_at = NOW(),
        reverted_at = NULL,
        execution_time_ms = $4,
        status = 'applied'
      `,
      [id, module, name, executionTimeMs],
    );
  }

  /**
   * Record a migration as reverted.
   *
   * @param module - Module name
   * @param name - Migration name
   */
  async recordReverted(module: string, name: string): Promise<void> {
    const connection = this.orm.em.getConnection();
    const id = `${module}_${name}`;

    await connection.execute(
      `
      UPDATE "${this.tableName}"
      SET reverted_at = NOW(), status = 'reverted'
      WHERE id = $1
      `,
      [id],
    );
  }
}
