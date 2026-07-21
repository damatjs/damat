import type { ColumnType } from "@damatjs/orm-type";

const numeric =
  "z.object({ lower: z.number().nullable(), upper: z.number().nullable(), isLowerBoundClosed: z.boolean(), isUpperBoundClosed: z.boolean(), isEmpty: z.boolean() })";
const date =
  "z.object({ lower: z.date().nullable(), upper: z.date().nullable(), isLowerBoundClosed: z.boolean(), isUpperBoundClosed: z.boolean(), isEmpty: z.boolean() })";

export const rangeZodTypes = new Map<ColumnType, string>([
  ["int4range", numeric],
  ["int8range", numeric],
  ["numrange", numeric],
  ["tsrange", date],
  ["tstzrange", date],
  ["daterange", date],
  ["int4multirange", `z.array(${numeric})`],
  ["int8multirange", `z.array(${numeric})`],
  ["nummultirange", `z.array(${numeric})`],
  ["tsmultirange", `z.array(${date})`],
  ["tstzmultirange", `z.array(${date})`],
  ["datemultirange", `z.array(${date})`],
]);
