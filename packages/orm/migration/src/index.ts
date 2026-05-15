/**
 * Migrations Module
 *
 * Module-based SQL migration system.
 * Each module can have its own migrations folder containing .sql files.
 *
 * @example
 * ```typescript
 * import {
 *   runMigrations,
 *   createMigration,
 *   runCli,
 * } from '@damatjs/orm-migration';
 * ```
 */

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

// Re-export logger utilities for convenience
export { log, separator, successBanner, errorBanner } from "./logger";
