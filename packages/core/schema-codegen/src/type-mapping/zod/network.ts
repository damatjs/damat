import type { ColumnType } from "@damatjs/orm-type";

export const networkZodTypes = new Map<ColumnType, string>([
  ["cidr", "z.string()"],
  ["inet", "z.string()"],
  ["macaddr", "z.string()"],
  ["macaddr8", "z.string()"],
]);
