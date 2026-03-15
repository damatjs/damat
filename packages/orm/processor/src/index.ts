/**
 * damatjs/orm-processor Module
 *
 * This package provides internal schema processing capabilities for the ORM, including:
 * - Schema difference detection (`diff`)
 * - Schema snapshot serialization and generation (`snapshot`)
 * - SQL query generation for migrations (`sqlGenerator`)
 * 
 * It is primarily used by the CLI and migration tools to compute what changes
 * need to be applied to a database to match the current codebase.
 *
 * @see processor.md for detailed documentation
 */

// =============================================================================
// TYPES
// =============================================================================

export type * from "./types";

// =============================================================================
// SNAPSHOTS
// =============================================================================

export * from "./snapshot";

// =============================================================================
// SCHEMA DIFF
// =============================================================================

export * from "./diff";

// =============================================================================
// SQL GENERATION
// =============================================================================

export * from "./sqlGenerator";

// =============================================================================
// DIFF 
// =============================================================================

export * from "./diff";

