import type { ColumnType } from "@damatjs/orm-type";

export const geometricTsTypes = new Map<ColumnType, string>([
  ["point", "{ x: number; y: number }"],
  ["lseg", "{ x1: number; y1: number; x2: number; y2: number }"],
  ["box", "{ x1: number; y1: number; x2: number; y2: number }"],
  ["circle", "{ x: number; y: number; radius: number }"],
  ["line", "string"],
  ["path", "string"],
  ["polygon", "string"],
]);
