/**
 * Link Module - Type Definitions
 *
 * Types for defining relationships between modules.
 */

import type { EntityClass } from "@damatjs/deps/mikro-orm/core";

// =============================================================================
// LINK RELATIONSHIP TYPES
// =============================================================================

/**
 * Supported relationship types between modules
 */
export type LinkRelationship =
  | "one-to-one"
  | "one-to-many"
  | "many-to-one"
  | "many-to-many";

// =============================================================================
// LINK ENDPOINT
// =============================================================================

/**
 * Defines one side of a link relationship
 */
export interface LinkEndpoint {
  /** Module name */
  module: string;
  /** Entity class */
  entity: EntityClass<any>;
  /** Field name to use for the relationship */
  field: string;
  /** Whether this side of the relationship is required */
  required?: boolean;
}

// =============================================================================
// LINK DEFINITION
// =============================================================================

/**
 * Complete definition of a link between two modules
 */
export interface LinkDefinition {
  /** Unique link name (used as table name for junction tables) */
  name: string;
  /** Source module/entity */
  from: LinkEndpoint;
  /** Target module/entity */
  to: LinkEndpoint;
  /** Type of relationship */
  relationship: LinkRelationship;
  /** Whether to cascade deletes */
  onDelete?: "cascade" | "set null" | "restrict";
  /** Additional metadata */
  metadata?: Record<string, any>;
}

// =============================================================================
// LOADED LINK
// =============================================================================

/**
 * A link after it has been loaded/registered
 */
export interface LoadedLink {
  definition: LinkDefinition;
  /** Junction table name (for many-to-many) */
  tableName?: string;
}
