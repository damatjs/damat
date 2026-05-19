import type { EnumSchema } from "@damatjs/orm-type";
import type {
  AlterEnumChange,
  CreateEnumChange,
  DropEnumChange,
  SchemaChange,
} from "../types/diff";
import { PRIORITY } from "./priority";
import { createNameMap, nativeEnumsEqual } from "./utils";

/**
 * Diff native enum types between two snapshots.
 */
export function diffEnums(
  oldEnums: EnumSchema[],
  newEnums: EnumSchema[],
): { changes: SchemaChange[]; warnings: string[] } {
  const changes: SchemaChange[] = [];
  const warnings: string[] = [];

  const oldMap = createNameMap(oldEnums);
  const newMap = createNameMap(newEnums);

  // Added enums
  for (const [name, newEnum] of newMap.entries()) {
    if (!oldMap.has(name)) {
      changes.push({
        type: "create_enum",
        enumDef: newEnum,
        priority: PRIORITY.CREATE_ENUM,
      } as CreateEnumChange);
    }
  }

  // Removed enums
  for (const name of oldMap.keys()) {
    if (!newMap.has(name)) {
      changes.push({
        type: "drop_enum",
        enumName: name,
        priority: PRIORITY.DROP_ENUM,
      } as DropEnumChange);
    }
  }

  // Altered enums
  for (const [name, newEnum] of newMap.entries()) {
    const oldEnum = oldMap.get(name);
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
