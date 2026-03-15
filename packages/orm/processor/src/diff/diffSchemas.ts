import type { SchemaDiff, SchemaChange } from "../types/diff";
import type { ModuleSnapshot } from "../types/snapshot";
import { createNameMap } from "./utils";
import { diffTable } from "./tables";
import { diffEnums } from "./enums";

/**
 * Compare two module snapshots and produce a full `SchemaDiff`.
 *
 * This is the primary entry point for the diff layer. Pass the snapshot
 * loaded from disk as `previous` and the snapshot built from live models
 * as `current` (use `compareSnapshots` from the snapshot layer to get both).
 *
 * Changes are sorted by priority so the SQL generator can emit them in
 * the correct dependency order (enums before tables, FKs after columns, etc.)
 */
export function diffSnapshots(
  previous: ModuleSnapshot,
  current: ModuleSnapshot,
): SchemaDiff {
  const allChanges: SchemaChange[] = [];
  const allWarnings: string[] = [];

  // Diff native enum types
  const { changes: enumChanges, warnings: enumWarnings } = diffEnums(
    previous.nativeEnums,
    current.nativeEnums,
  );
  allChanges.push(...enumChanges);
  allWarnings.push(...enumWarnings);

  // Diff tables
  const oldMap = createNameMap(previous.tables);
  const newMap = createNameMap(current.tables);

  for (const tableName of new Set([...oldMap.keys(), ...newMap.keys()])) {
    const { changes, warnings } = diffTable(
      oldMap.get(tableName),
      newMap.get(tableName),
    );
    allChanges.push(...changes);
    allWarnings.push(...warnings);
  }

  allChanges.sort((a, b) => a.priority - b.priority);

  return {
    hasChanges: allChanges.length > 0,
    changes: allChanges,
    warnings: allWarnings,
  };
}
