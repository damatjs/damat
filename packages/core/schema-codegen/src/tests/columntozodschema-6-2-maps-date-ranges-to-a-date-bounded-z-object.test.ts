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
  it("maps date ranges to a date-bounded z.object", () => {
    const shape =
      "z.object({ lower: z.date().nullable(), upper: z.date().nullable(), isLowerBoundClosed: z.boolean(), isUpperBoundClosed: z.boolean(), isEmpty: z.boolean() })";
    for (const t of ["tsrange", "tstzrange", "daterange"] as const) {
      expect(columnToZodSchema(col(t))).toBe(shape);
    }
  });
});
