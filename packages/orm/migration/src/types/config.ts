import type { DatabaseModule } from "./module";

// =============================================================================
// DATABASE CONFIG
// =============================================================================

/**
 * Database connection configuration (pg Pool options)
 */
export interface DatabaseConfig {
  /** PostgreSQL connection URL (e.g. postgres://user:pass@host/db) */
  url: string;
  /** Database name (extracted from URL if not provided) */
  dbName?: string;
  /** Enable debug / query logging (default: false) */
  debug?: boolean;
  /** Connection pool minimum size (default: 2) */
  poolMin?: number;
  /** Connection pool maximum size (default: 10) */
  poolMax?: number;
}

/**
 * Full migration system configuration
 */
export interface OrmConfig {
  /** Database connection configuration */
  database: DatabaseConfig;
  /** Registered modules */
  modules: DatabaseModule[];
}
