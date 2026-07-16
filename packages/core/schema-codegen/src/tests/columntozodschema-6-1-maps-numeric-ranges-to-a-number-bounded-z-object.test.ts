import { describe, it, expect } from "bun:test";
import { ColumnSchema, ColumnType } from "@damatjs/orm-type";
import { columnToZodSchema } from "../columnToZodSchema";

const col = (
  type: ColumnType,
  extra: Partial<ColumnSchema> = {},
): ColumnSchema => ({
  name: "c",
  type,
  nullable: false,
  ...extra,
});

describe("columnToZodSchema › range and multirange types", () => {
  it("maps numeric ranges to a number-bounded z.object", () => {
    const shape =
      "z.object({ lower: z.number().nullable(), upper: z.number().nullable(), isLowerBoundClosed: z.boolean(), isUpperBoundClosed: z.boolean(), isEmpty: z.boolean() })";
    for (const t of ["int4range", "int8range", "numrange"] as const) {
      expect(columnToZodSchema(col(t))).toBe(shape);
    }
  });
});
