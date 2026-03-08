// =============================================================================
// MIGRATIONS
// =============================================================================

/**
 * Information about a single migration file
 */
export interface MigrationInfo {
  /** Migration class name */
  name: string;
  /** Module the migration belongs to */
  module: string;
  /** Full path to migration file */
  path: string;
  /** Timestamp extracted from filename */
  timestamp: number;
  /** Whether migration has been applied */
  applied: boolean;
}

/**
 * Result of running migrations for a module
 */
export interface ModuleMigrationResult {
  /** Whether all migrations succeeded */
  success: boolean;
  /** Module name */
  module: string;
  /** List of applied migration names */
  applied: string[];
  /** List of reverted migration names */
  reverted: string[];
  /** List of pending migration names */
  pending: string[];
  /** Error if migration failed */
  error?: Error;
}

/**
 * Migration status for a module
 */
export interface ModuleMigrationStatus {
  /** Module name */
  name: string;
  /** Number of applied migrations */
  applied: number;
  /** Number of pending migrations */
  pending: number;
  /** List of all migrations with status */
  migrations: MigrationInfo[];
}

/**
 * Overall migration status
 */
export interface MigrationStatus {
  /** Status for each module */
  modules: ModuleMigrationStatus[];
}


export type MigrationDirection = "up" | "down";