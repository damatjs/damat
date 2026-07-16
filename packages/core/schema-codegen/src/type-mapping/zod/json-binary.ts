import type { ColumnType } from "@damatjs/orm-type";

export const jsonBinaryZodTypes = new Map<ColumnType, string>([
  ["bytea", "z.unknown()"],
  ["json", "z.unknown()"],
  ["jsonb", "z.unknown()"],
  ["jsonpath", "z.string()"],
]);
