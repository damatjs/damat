import type { ColumnType } from "@damatjs/orm-type";

export const scalarZodTypes = new Map<ColumnType, string>([
  ["smallint", "z.number().int()"],
  ["integer", "z.number().int()"],
  ["smallserial", "z.number().int()"],
  ["serial", "z.number().int()"],
  ["bigint", "z.bigint()"],
  ["bigserial", "z.bigint()"],
  ["real", "z.number()"],
  ["double precision", "z.number()"],
  ["numeric", "z.number()"],
  ["decimal", "z.number()"],
  ["money", "z.string()"],
  ["boolean", "z.boolean()"],
  ["enum", "z.string()"],
  ["uuid", "z.string().uuid()"],
]);
