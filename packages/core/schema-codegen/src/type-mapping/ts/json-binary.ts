import type { ColumnType } from "@damatjs/orm-type";

export const jsonBinaryTsTypes = new Map<ColumnType, string>([
  ["bytea", "Buffer"],
  ["json", "unknown"],
  ["jsonb", "unknown"],
  ["jsonpath", "string"],
]);
