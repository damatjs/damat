import type { ColumnType } from "@damatjs/orm-type";

const interval =
  "{ years: number; months: number; days: number; hours: number; minutes: number; seconds: number; milliseconds: number }";

export const temporalTsTypes = new Map<ColumnType, string>([
  ["timestamp without time zone", "Date"],
  ["timestamp with time zone", "Date"],
  ["date", "Date"],
  ["time without time zone", "string"],
  ["time with time zone", "string"],
  ["interval", interval],
]);
