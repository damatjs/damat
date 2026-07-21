import { ColumnSchema, ColumnType } from "@damatjs/orm-type";
import { columnToZodSchema } from "../../columnToZodSchema";
import { describe, it, expect } from "bun:test";

{
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
}

{
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
}

{
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
    it("maps numeric multiranges to z.array of the range object", () => {
      expect(columnToZodSchema(col("int4multirange"))).toBe(
        "z.array(z.object({ lower: z.number().nullable(), upper: z.number().nullable(), isLowerBoundClosed: z.boolean(), isUpperBoundClosed: z.boolean(), isEmpty: z.boolean() }))",
      );
    });
  });
}

{
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
    it("maps date multiranges to z.array of the date range object", () => {
      expect(columnToZodSchema(col("tstzmultirange"))).toBe(
        "z.array(z.object({ lower: z.date().nullable(), upper: z.date().nullable(), isLowerBoundClosed: z.boolean(), isUpperBoundClosed: z.boolean(), isEmpty: z.boolean() }))",
      );
    });
  });
}
