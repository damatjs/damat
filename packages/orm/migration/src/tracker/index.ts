import type { DurabilityExecutor } from "@damatjs/durability";
import { migrationId } from "./id";
import { MIGRATION_TRACKER_SCHEMA, MIGRATION_TRACKER_TABLE } from "./schema";
import type { AppliedMigration } from "./types";

export type { AppliedMigration } from "./types";

/**
 * Migration tracking table operations.
 *
 * Manages a `_damat_migration_logs` table to track which migrations
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
  constructor(private executor: DurabilityExecutor) {}

  /**
   * Ensure the migration tracking table exists.
   * Creates the table and indexes if they don't exist.
   */
  async ensureTable(): Promise<void> {
    await this.executor.query(MIGRATION_TRACKER_SCHEMA);
  }

  /**
   * Get applied migrations for a module (or all modules).
   *
   * @param moduleName - Optional module name to filter by
   */
  async getApplied(moduleName?: string): Promise<AppliedMigration[]> {
    if (moduleName) {
      const res = await this.executor.query<AppliedMigration>(
        `SELECT module, name, applied_at
                 FROM "${MIGRATION_TRACKER_TABLE}"
                 WHERE status = 'applied' AND module = $1
                 ORDER BY applied_at ASC`,
        [moduleName],
      );
      return res.rows;
    }

    const res = await this.executor.query<AppliedMigration>(
      `SELECT module, name, applied_at
             FROM "${MIGRATION_TRACKER_TABLE}"
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
    executor: DurabilityExecutor = this.executor,
  ): Promise<void> {
    // Conflict resolution targets UNIQUE(module, name), never the `id` PK, so
    // an id collision between two distinct (module, name) pairs can't clobber.
    await executor.query(
      `INSERT INTO "_damat_migration_logs" (id, module, name, execution_time_ms, status)
             VALUES ($1, $2, $3, $4, 'applied')
             ON CONFLICT (module, name) DO UPDATE SET
                 applied_at         = NOW(),
                 reverted_at        = NULL,
                 execution_time_ms  = $4,
                 status             = 'applied'`,
      [migrationId(module, name), module, name, executionTimeMs],
    );
  }

  /**
   * Record a migration as reverted.
   */
  async recordReverted(module: string, name: string): Promise<void> {
    // Key off (module, name) so pre-existing rows written with the old
    // `${module}_${name}` id scheme still match regardless of id format.
    await this.executor.query(
      `UPDATE "_damat_migration_logs"
             SET reverted_at = NOW(), status = 'reverted'
             WHERE module = $1 AND name = $2`,
      [module, name],
    );
  }
}
