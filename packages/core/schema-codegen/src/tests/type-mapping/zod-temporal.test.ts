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

  describe("columnToZodSchema › temporal types", () => {
    it("maps date / timestamp types to z.coerce.date()", () => {
      for (const t of [
        "timestamp without time zone",
        "timestamp with time zone",
        "date",
      ] as const) {
        expect(columnToZodSchema(col(t))).toBe("z.coerce.date()");
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

  describe("columnToZodSchema › temporal types", () => {
    it("maps time types to z.string()", () => {
      expect(columnToZodSchema(col("time without time zone"))).toBe(
        "z.string()",
      );
      expect(columnToZodSchema(col("time with time zone"))).toBe("z.string()");
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

  describe("columnToZodSchema › temporal types", () => {
    it("maps interval to a structured z.object", () => {
      expect(columnToZodSchema(col("interval"))).toBe(
        "z.object({ years: z.number(), months: z.number(), days: z.number(), hours: z.number(), minutes: z.number(), seconds: z.number(), milliseconds: z.number() })",
      );
    });
  });
}
