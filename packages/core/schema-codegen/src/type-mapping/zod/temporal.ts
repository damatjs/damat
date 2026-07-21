import type { ColumnType } from "@damatjs/orm-type";

const interval =
  "z.object({ years: z.number(), months: z.number(), days: z.number(), hours: z.number(), minutes: z.number(), seconds: z.number(), milliseconds: z.number() })";

export const temporalZodTypes = new Map<ColumnType, string>([
  ["timestamp without time zone", "z.coerce.date()"],
  ["timestamp with time zone", "z.coerce.date()"],
  ["date", "z.coerce.date()"],
  ["time without time zone", "z.string()"],
  ["time with time zone", "z.string()"],
  ["interval", interval],
]);
