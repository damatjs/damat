import type { ModuleSchema } from "@damatjs/orm-type";
import type { SchemaDiff, SchemaChange } from "../types/diff";
import { createNameMap } from "./utils";
import { diffTable } from "./tables";
import { diffEnums } from "./enums";

/**
 * Compare two ModuleSchemas and produce a full `SchemaDiff`.
 *
 * This is the primary entry point for the diff layer. Pass the schema
 * loaded from disk as `previous` and the schema built from live models
 * as `current`.
 *
 * Changes are sorted by priority so the SQL generator can emit them in
 * the correct dependency order (enums before tables, FKs after columns, etc.)
 */
export function diffSchemas(
  previous: ModuleSchema,
  current: ModuleSchema,
): SchemaDiff {
  const allChanges: SchemaChange[] = [];
  const allWarnings: string[] = [];

  // Diff native enum types
  const { changes: enumChanges, warnings: enumWarnings } = diffEnums(
    previous.enums ?? [],
    current.enums ?? [],
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
