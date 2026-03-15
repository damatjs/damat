import type {
  AlterEnumChange,
  CreateEnumChange,
  DropEnumChange,
  SchemaChange,
} from "../types/diff";
import type { NativeEnum } from "../types/snapshot";
import { PRIORITY } from "./priority";
import { nativeEnumsEqual } from "./utils";

/**
 * Diff native enum types between two snapshots.
 * Both sides are keyed records — the same shape stored in `ModuleSnapshot.nativeEnums`.
 */
export function diffEnums(
  oldEnums: Record<string, NativeEnum>,
  newEnums: Record<string, NativeEnum>,
): { changes: SchemaChange[]; warnings: string[] } {
  const changes: SchemaChange[] = [];
  const warnings: string[] = [];

  // Added enums
  for (const [name, newEnum] of Object.entries(newEnums)) {
    if (!(name in oldEnums)) {
      changes.push({
        type: "create_enum",
        enumDef: newEnum,
        priority: PRIORITY.CREATE_ENUM,
      } as CreateEnumChange);
    }
  }

  // Removed enums
  for (const name of Object.keys(oldEnums)) {
    if (!(name in newEnums)) {
      changes.push({
        type: "drop_enum",
        enumName: name,
        priority: PRIORITY.DROP_ENUM,
      } as DropEnumChange);
    }
  }

  // Altered enums
  for (const [name, newEnum] of Object.entries(newEnums)) {
    const oldEnum = oldEnums[name];
    if (oldEnum && !nativeEnumsEqual(oldEnum, newEnum)) {
      const oldSet = new Set(oldEnum.values);
      const newSet = new Set(newEnum.values);

      const addValues = newEnum.values.filter((v) => !oldSet.has(v));
      const removeValues = oldEnum.values.filter((v) => !newSet.has(v));

      if (addValues.length > 0 || removeValues.length > 0) {
        changes.push({
          type: "alter_enum",
          enumName: name,
          addValues: addValues.length > 0 ? addValues : undefined,
          removeValues: removeValues.length > 0 ? removeValues : undefined,
          priority: PRIORITY.ALTER_ENUM,
        } as AlterEnumChange);

        if (removeValues.length > 0) {
          warnings.push(
            `Removing values from enum '${name}' is not directly supported in PostgreSQL. ` +
              `You may need to create a new enum type and migrate existing data.`,
          );
        }
      }
    }
  }

  return { changes, warnings };
}
