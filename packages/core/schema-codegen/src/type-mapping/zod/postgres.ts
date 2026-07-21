import type { ColumnType } from "@damatjs/orm-type";

export const postgresZodTypes = new Map<ColumnType, string>([
  ["xml", "z.string()"],
  ["bit", "z.string()"],
  ["bit varying", "z.string()"],
  ["oid", "z.number().int()"],
  ["pg_lsn", "z.string()"],
  ["pg_snapshot", "z.string()"],
]);
