/**
 * BaseMigration
 *
 * Base class that every generated migration file extends.
 * Collects SQL statements via `addSql()` so the executor can run them
 * inside a transaction using a plain pg Pool.
 */
export abstract class BaseMigration {
  /** SQL statements queued by `addSql()` */
  readonly _queries: string[] = [];

  /**
   * Queue a SQL statement to be executed when the migration runs.
   */
  protected addSql(sql: string): void {
    this._queries.push(sql.trim());
  }

  /** Apply the migration */
  abstract up(): Promise<void>;

  /** Revert the migration */
  abstract down(): Promise<void>;
}
