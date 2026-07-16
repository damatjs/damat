import type { ColumnSchema, ColumnType } from "@damatjs/orm-type";
import { geometricZodTypes } from "./geometric";
import { jsonBinaryZodTypes } from "./json-binary";
import { networkZodTypes } from "./network";
import { postgresZodTypes } from "./postgres";
import { rangeZodTypes } from "./range";
import { scalarZodTypes } from "./scalars";
import { searchZodTypes } from "./search";
import { temporalZodTypes } from "./temporal";

const groups = [
  scalarZodTypes,
  temporalZodTypes,
  jsonBinaryZodTypes,
  networkZodTypes,
  geometricZodTypes,
  rangeZodTypes,
  searchZodTypes,
  postgresZodTypes,
];

export function getZodBaseType(type: ColumnType, column: ColumnSchema): string {
  if (["text", "character", "character varying"].includes(type)) {
    return column.length ? `z.string().max(${column.length})` : "z.string()";
  }
  for (const group of groups) {
    const mapped = group.get(type);
    if (mapped !== undefined) return mapped;
  }
  return "z.unknown()";
}
