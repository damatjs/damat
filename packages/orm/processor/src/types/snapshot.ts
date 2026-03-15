import type { TableSchema } from "@damatjs/orm-model/types";

// =============================================================================
// SNAPSHOT
// =============================================================================

/**
 * A named PostgreSQL enum type that lives in the database schema.
 * Produced when a model column references an enum by name rather than
 * supplying inline values.
 */
export interface NativeEnum {
  /** The enum type name in the database */
  name: string;
  /** The PostgreSQL schema it belongs to (defaults to "public") */
  schema: string;
  /** The ordered list of enum labels */
  values: string[];
}

/**
 * The full schema state for one module, persisted as a snapshot file.
 *
 * Shape mirrors the empty baseline:
 *   { namespaces: ["public"], name: "public", tables: [], nativeEnums: {} }
 */
export interface ModuleSnapshot {
  /** PostgreSQL schema namespaces covered by this module (e.g. ["public"]) */
  namespaces: string[];
  /** The primary namespace / module label */
  name: string;
  /** All table schemas belonging to this module */
  tables: TableSchema[];
  /**
   * Named PostgreSQL enum types keyed by their type name.
   * Empty object when the module uses only inline enum values.
   */
  nativeEnums: Record<string, NativeEnum>;
  /** ISO-8601 timestamp of when this snapshot was last written */
  updatedAt: string;
}

/** The empty/baseline snapshot returned when no snapshot file exists yet */
export const EMPTY_SNAPSHOT: Omit<ModuleSnapshot, "updatedAt"> = {
  namespaces: ["public"],
  name: "public",
  tables: [],
  nativeEnums: {},
};
