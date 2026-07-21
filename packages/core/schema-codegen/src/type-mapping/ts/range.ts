import type { ColumnType } from "@damatjs/orm-type";

const range = (bound: string): string =>
  `{ lower: ${bound} | null; upper: ${bound} | null; isLowerBoundClosed: boolean; isUpperBoundClosed: boolean; isEmpty: boolean }`;
const multiRange = (bound: string): string => `Array<${range(bound)}>`;

export const rangeTsTypes = new Map<ColumnType, string>([
  ["int4range", range("number")],
  ["int8range", range("bigint")],
  ["numrange", range("number")],
  ["tsrange", range("Date")],
  ["tstzrange", range("Date")],
  ["daterange", range("Date")],
  ["int4multirange", multiRange("number")],
  ["int8multirange", multiRange("bigint")],
  ["nummultirange", multiRange("number")],
  ["tsmultirange", multiRange("Date")],
  ["tstzmultirange", multiRange("Date")],
  ["datemultirange", multiRange("Date")],
]);
