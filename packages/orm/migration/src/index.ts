/**
 * Migrations Module
 *
 * Module-based migration system with UP/DOWN support.
 * Each module can have its own migrations folder.
 *
 * @example
 * ```typescript
 * import {
 *   runMigrations,
 *   revertMigrations,
 *   createMigration,
 *   runCli,
 *   BaseMigration,
 * } from '@damatjs/orm-migration';
 * ```
 */

// Base migration class (used by generated migration files)
export * from "./migration";

// Logger
export * from "./logger";

// Discovery
export * from "./discovery";

// Generator
export * from "./generator";

// Tracker
export * from "./tracker";

// Executor
export * from "./executor";

// CLI
export * from "./cli";
