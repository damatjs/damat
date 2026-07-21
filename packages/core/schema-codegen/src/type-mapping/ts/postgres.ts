import type { ColumnType } from "@damatjs/orm-type";

export const postgresTsTypes = new Map<ColumnType, string>([
  ["xml", "string"],
  ["bit", "string"],
  ["bit varying", "string"],
  ["oid", "number"],
  ["pg_lsn", "string"],
  ["pg_snapshot", "string"],
]);
