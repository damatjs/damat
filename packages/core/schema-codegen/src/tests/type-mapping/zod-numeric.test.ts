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

  describe("columnToZodSchema › numeric types", () => {
    it("maps integer-family types to z.number().int()", () => {
      for (const t of [
        "smallint",
        "integer",
        "smallserial",
        "serial",
        "oid",
      ] as const) {
        expect(columnToZodSchema(col(t))).toBe("z.number().int()");
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

  describe("columnToZodSchema › numeric types", () => {
    it("maps bigint / bigserial to z.bigint()", () => {
      expect(columnToZodSchema(col("bigint"))).toBe("z.bigint()");
      expect(columnToZodSchema(col("bigserial"))).toBe("z.bigint()");
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

  describe("columnToZodSchema › numeric types", () => {
    it("maps floating point and exact numeric to z.number()", () => {
      for (const t of [
        "real",
        "double precision",
        "numeric",
        "decimal",
      ] as const) {
        expect(columnToZodSchema(col(t))).toBe("z.number()");
      }
    });
  });
}
