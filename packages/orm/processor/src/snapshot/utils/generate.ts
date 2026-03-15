import type { ModuleSnapshot } from "../../types/snapshot";
import type { SchemaDiff } from "../../types/diff";
import type {
  MigrationGeneratorOptions,
  GeneratedMigration,
} from "../../types/diff";
import {
  generateFromSnapshot as _generateFromSnapshot,
  generateFromDiff as _generateFromDiff,
} from "../../sqlGenerator/generateMigration";

export type { GeneratedMigration };

/**
 * Generate UP and DOWN SQL for the full schema described by a snapshot.
 * Produces a fresh baseline migration — no diff required.
 */
export function generateFromSnapshot(
  snapshot: ModuleSnapshot,
  options?: MigrationGeneratorOptions,
): GeneratedMigration {
  return _generateFromSnapshot(snapshot, options);
}

/**
 * Generate UP and DOWN SQL for only the changes described by a diff.
 */
export function generateFromDiff(
  diff: SchemaDiff,
  _previous: ModuleSnapshot,
  _current: ModuleSnapshot,
  options?: MigrationGeneratorOptions,
): GeneratedMigration {
  return _generateFromDiff(diff, options);
}
