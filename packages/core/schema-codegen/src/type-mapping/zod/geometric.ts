import type { ColumnType } from "@damatjs/orm-type";

export const geometricZodTypes = new Map<ColumnType, string>([
  ["point", "z.object({ x: z.number(), y: z.number() })"],
  [
    "lseg",
    "z.object({ x1: z.number(), y1: z.number(), x2: z.number(), y2: z.number() })",
  ],
  [
    "box",
    "z.object({ x1: z.number(), y1: z.number(), x2: z.number(), y2: z.number() })",
  ],
  ["circle", "z.object({ x: z.number(), y: z.number(), radius: z.number() })"],
  ["line", "z.string()"],
  ["path", "z.string()"],
  ["polygon", "z.string()"],
]);
