/**
 * Enum Diff
 *
 * Compare enums between two schemas and detect changes.
 */

import type {
  AlterEnumChange,
  CreateEnumChange,
  DropEnumChange,
  EnumSchema,
  SchemaChange,
} from "../types";
import { PRIORITY } from "./priority";
import { createNameMap, enumsEqual } from "./utils";

/**
 * Diff enums between two schemas
 */
export function diffEnums(
  oldEnums: EnumSchema[],
  newEnums: EnumSchema[],
): { changes: SchemaChange[]; warnings: string[] } {
  const changes: SchemaChange[] = [];
  const warnings: string[] = [];

  const oldMap = createNameMap(oldEnums);
  const newMap = createNameMap(newEnums);

  // Find added enums
  for (const [name, newEnum] of newMap) {
    if (!oldMap.has(name)) {
      changes.push({
        type: "create_enum",
        enumDef: newEnum,
        priority: PRIORITY.CREATE_ENUM,
      } as CreateEnumChange);
    }
  }

  // Find removed enums
  for (const [name] of oldMap) {
    if (!newMap.has(name)) {
      changes.push({
        type: "drop_enum",
        enumName: name,
        priority: PRIORITY.DROP_ENUM,
      } as DropEnumChange);
    }
  }

  // Find altered enums
  for (const [name, newEnum] of newMap) {
    const oldEnum = oldMap.get(name);
    if (oldEnum && !enumsEqual(oldEnum, newEnum)) {
      const oldSet = new Set(oldEnum.values);
      const newSet = new Set(newEnum.values);

      const addValues = newEnum.values.filter((v: string) => !oldSet.has(v));
      const removeValues = oldEnum.values.filter((v: string) => !newSet.has(v));

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
