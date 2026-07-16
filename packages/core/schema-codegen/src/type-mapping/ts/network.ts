import type { ColumnType } from "@damatjs/orm-type";

export const networkTsTypes = new Map<ColumnType, string>([
  ["cidr", "string"],
  ["inet", "string"],
  ["macaddr", "string"],
  ["macaddr8", "string"],
]);
