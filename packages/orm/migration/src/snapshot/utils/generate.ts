import type { ModuleSnapshot } from "../../types/snapshot";
import type { SchemaDiff } from "../../types/diff";

/**
 * Ordered SQL statements for a migration.
 * Produced by the SQL generator layer (not yet implemented).
 */
export type GeneratedSQL = {
  /** Ordered UP statements */
  up: string[];
  /** Ordered DOWN / rollback statements */
  down: string[];
};

/**
 * Generate SQL for the full schema described by a snapshot.
 * Assumes no previous state — produces a fresh baseline migration.
 *
 * @stub  Implementation lives in the SQL generator layer (not yet wired).
 */
export function generateFromSnapshot(_snapshot: ModuleSnapshot): GeneratedSQL {
  throw new Error(
    "generateFromSnapshot: not yet implemented — wire the generator layer",
  );
}

/**
 * Generate SQL for only the changes described by a diff.
 *
 * @stub  Implementation lives in the SQL generator layer (not yet wired).
 */
export function generateFromDiff(
  _diff: SchemaDiff,
  _previous: ModuleSnapshot,
  _current: ModuleSnapshot,
): GeneratedSQL {
  throw new Error(
    "generateFromDiff: not yet implemented — wire the generator layer",
  );
}
