import type { ColumnType } from "@damatjs/orm-type";

export const searchZodTypes = new Map<ColumnType, string>([
  ["tsvector", "z.string()"],
  ["tsquery", "z.string()"],
]);
