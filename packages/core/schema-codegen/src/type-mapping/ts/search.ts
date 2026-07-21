import type { ColumnType } from "@damatjs/orm-type";

export const searchTsTypes = new Map<ColumnType, string>([
  ["tsvector", "string"],
  ["tsquery", "string"],
]);
