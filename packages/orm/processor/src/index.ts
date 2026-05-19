/**
 * damatjs/orm-processor Module
 *
 * This package provides internal schema processing capabilities for the ORM, including:
 * - Schema difference detection (`diff`)
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
// SCHEMA DIFF
// =============================================================================

export * from "./diff";

// =============================================================================
// SQL GENERATION
// =============================================================================

export * from "./sqlGenerator";


// =============================================================================
// SNAPSHOT
// =============================================================================

export * from "./snapshot";
