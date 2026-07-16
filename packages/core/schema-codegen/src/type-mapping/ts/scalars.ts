import type { ColumnType } from "@damatjs/orm-type";

export const scalarTsTypes = new Map<ColumnType, string>([
  ["boolean", "boolean"],
  ["smallint", "number"],
  ["integer", "number"],
  ["smallserial", "number"],
  ["serial", "number"],
  ["bigint", "bigint"],
  ["bigserial", "bigint"],
  ["real", "number"],
  ["double precision", "number"],
  ["numeric", "number"],
  ["decimal", "number"],
  ["money", "string"],
  ["text", "string"],
  ["character varying", "string"],
  ["character", "string"],
  ["uuid", "string"],
]);
