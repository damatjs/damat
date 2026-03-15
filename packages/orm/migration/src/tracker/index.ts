/**
 * Migration Tracker
 *
 * Manages the migration tracking table in the database using pg Pool.
 */

import type { Pool } from "@damatjs/deps/pg";

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
 * const tracker = new MigrationTracker(pool);
 * await tracker.ensureTable();
 *
 * const applied = await tracker.getApplied('user');
 * await tracker.recordApplied('user', 'Migration20260316_Initial', 150);
 * await tracker.recordReverted('user', 'Migration20260316_Initial');
 * ```
 */
export class MigrationTracker {
  private pool: Pool;
  private tableName = TABLE_NAME;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Ensure the migration tracking table exists.
   * Creates the table and indexes if they don't exist.
   */
  async ensureTable(): Promise<void> {
    await this.pool.query(`
            CREATE TABLE IF NOT EXISTS "${this.tableName}" (
                "id"                 TEXT        PRIMARY KEY,
                "module"             TEXT        NOT NULL,
                "name"               TEXT        NOT NULL,
                "applied_at"         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                "reverted_at"        TIMESTAMPTZ,
                "execution_time_ms"  INTEGER,
                "status"             TEXT        NOT NULL DEFAULT 'applied',
                UNIQUE ("module", "name")
            );

            CREATE INDEX IF NOT EXISTS "idx_${this.tableName}_module"
                ON "${this.tableName}" ("module");

            CREATE INDEX IF NOT EXISTS "idx_${this.tableName}_status"
                ON "${this.tableName}" ("status");
        `);
  }

  /**
   * Get applied migrations for a module (or all modules).
   *
   * @param moduleName - Optional module name to filter by
   */
  async getApplied(moduleName?: string): Promise<AppliedMigration[]> {
    if (moduleName) {
      const res = await this.pool.query<AppliedMigration>(
        `SELECT module, name, applied_at
                 FROM "${this.tableName}"
                 WHERE status = 'applied' AND module = $1
                 ORDER BY applied_at ASC`,
        [moduleName],
      );
      return res.rows;
    }

    const res = await this.pool.query<AppliedMigration>(
      `SELECT module, name, applied_at
             FROM "${this.tableName}"
             WHERE status = 'applied'
             ORDER BY applied_at ASC`,
    );
    return res.rows;
  }

  /**
   * Record a migration as applied.
   */
  async recordApplied(
    module: string,
    name: string,
    executionTimeMs: number,
  ): Promise<void> {
    const id = `${module}_${name}`;
    await this.pool.query(
      `INSERT INTO "${this.tableName}" (id, module, name, execution_time_ms, status)
             VALUES ($1, $2, $3, $4, 'applied')
             ON CONFLICT (id) DO UPDATE SET
                 applied_at         = NOW(),
                 reverted_at        = NULL,
                 execution_time_ms  = $4,
                 status             = 'applied'`,
      [id, module, name, executionTimeMs],
    );
  }

  /**
   * Record a migration as reverted.
   */
  async recordReverted(module: string, name: string): Promise<void> {
    const id = `${module}_${name}`;
    await this.pool.query(
      `UPDATE "${this.tableName}"
             SET reverted_at = NOW(), status = 'reverted'
             WHERE id = $1`,
      [id],
    );
  }
}
