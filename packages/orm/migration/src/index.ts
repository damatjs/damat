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
 *   createInitialMigration,
 *   createDiffMigration,
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

// Re-export logger utilities for convenience
export { log, separator, successBanner, errorBanner } from "./logger";
