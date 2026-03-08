/**
 * Column Extraction
 *
 * Extract column schema from MikroORM property metadata.
 */

import type { ColumnSchema } from "../types";
import { mapPropertyType, extractEnum, getDefaultValue } from "./typeMapping";

/**
 * Extract column schema from a MikroORM property
 */
export function extractColumn(prop: Record<string, unknown>): ColumnSchema {
  const type = mapPropertyType(prop);
  const enumInfo = type === "enum" ? extractEnum(prop) : null;
  const fieldNames = prop.fieldNames as string[] | undefined;
  const unique = prop.unique;

  const column: ColumnSchema = {
    name: fieldNames?.[0] || (prop.name as string),
    type,
    nullable: (prop.nullable as boolean) ?? false,
    primaryKey: (prop.primary as boolean) ?? false,
    unique: unique === true,
  };

  // Add optional properties only if defined
  if (prop.length !== undefined) {
    column.length = prop.length as number;
  }
  if (prop.scale !== undefined) {
    column.scale = prop.scale as number;
  }

  const defaultValue = getDefaultValue(prop);
  if (defaultValue !== undefined) {
    column.default = defaultValue;
  }

  if (enumInfo?.values) {
    column.enumValues = enumInfo.values;
    column.enumName = enumInfo.name;
  }

  if (prop.array === true) {
    column.array = true;
  }

  if (fieldNames?.[0]) {
    column.fieldName = fieldNames[0];
  }

  return column;
}
