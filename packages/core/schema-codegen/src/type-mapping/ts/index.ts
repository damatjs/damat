import type { ColumnType } from "@damatjs/orm-type";
import { geometricTsTypes } from "./geometric";
import { jsonBinaryTsTypes } from "./json-binary";
import { networkTsTypes } from "./network";
import { postgresTsTypes } from "./postgres";
import { rangeTsTypes } from "./range";
import { scalarTsTypes } from "./scalars";
import { searchTsTypes } from "./search";
import { temporalTsTypes } from "./temporal";

const groups = [
  scalarTsTypes,
  temporalTsTypes,
  jsonBinaryTsTypes,
  networkTsTypes,
  geometricTsTypes,
  rangeTsTypes,
  searchTsTypes,
  postgresTsTypes,
];

export function pgTypeToTsBase(type: ColumnType): string {
  if (type === "enum") return "string";
  for (const group of groups) {
    const mapped = group.get(type);
    if (mapped !== undefined) return mapped;
  }
  return undefined as unknown as string;
}

export function enumTypeToTsBase(enumValues?: string[]): string {
  if (enumValues && enumValues.length > 0) {
    return enumValues.map((value) => `'${value}'`).join(" | ");
  }
  return "string";
}
