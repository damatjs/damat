/**
 * Migration Generator
 *
 * Functions for creating new migration files with support for:
 * - Empty template migrations (manual SQL)
 * - Schema diff-based migrations (automatic SQL generation)
 * - Initial/baseline migrations (full table creation)
 */

// =============================================================================
// SCHEMA SNAPSHOT MANAGEMENT
// =============================================================================

export * from "./snapshot";

// =============================================================================
// DIFF-BASED MIGRATION CREATION
// =============================================================================

export * from "./diffMigration";

// =============================================================================
// INITIAL MIGRATION CREATION
// =============================================================================

export * from "./initialMigration";

// =============================================================================
// SCHEMA SNAPSHOT UTILITIES
// =============================================================================

export * from "./snapshot/utils";

// =============================================================================
// RE-EXPORTS
// =============================================================================

export * from "./utils";
export * from "./introspection";
export * from "./diff";
export * from "./sqlGenerator";
export * from "./types";
