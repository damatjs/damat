/**
 * Migration Generator
 *
 * Functions for creating new migration files with support for:
 * - Empty template migrations (manual SQL)
 * - Schema diff-based migrations (automatic SQL generation)
 * - Initial/baseline migrations (full table creation)
 */

// =============================================================================
// DIFF-BASED MIGRATION CREATION
// =============================================================================

export * from "./diffMigration";

// =============================================================================
// INITIAL MIGRATION CREATION
// =============================================================================

export * from "./initialMigration";

// =============================================================================
// RE-EXPORTS
// =============================================================================

export * from "./utils";
export * from "./introspection";
export * from "./sqlGenerator";
export * from "./types";
