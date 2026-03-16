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

// /**
//  * Full migration system configuration
//  */
// export interface OrmConfig {
//   /** Database connection configuration */
//   database: DatabaseConfig;
//   /** Registered modules */
//   modules: DatabaseModule[];
// }


// // =============================================================================
// // MODULE DEFINITION
// // =============================================================================

// /**
//  * Database module definition.
//  * Each feature module registers its migrations path and models here.
//  */
// export interface DatabaseModule {
//   /** Unique module name */
//   name: string;
//   /** Model definitions for schema snapshot and migration generation.
//    *  Auto-discovered from {modulesDir}/{name}/models/ when not provided. */
//   models?: ModelDefinition<ModelProperties>[];
//   /** Path to migrations directory (relative to modulesDir/{name}) */
//   migrationsPath?: string;
// }

// /**
//  * Database module registry.
//  * Maps module names to their definitions.
//  */
// export type DatabaseModuleRegistry = Record<string, DatabaseModule>;
