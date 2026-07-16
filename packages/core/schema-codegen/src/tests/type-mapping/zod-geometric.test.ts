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

  describe("columnToZodSchema › geometric types", () => {
    it("maps point to z.object with x/y", () => {
      expect(columnToZodSchema(col("point"))).toBe(
        "z.object({ x: z.number(), y: z.number() })",
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

  describe("columnToZodSchema › geometric types", () => {
    it("maps lseg and box to the four-coordinate object", () => {
      const shape =
        "z.object({ x1: z.number(), y1: z.number(), x2: z.number(), y2: z.number() })";
      expect(columnToZodSchema(col("lseg"))).toBe(shape);
      expect(columnToZodSchema(col("box"))).toBe(shape);
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

  describe("columnToZodSchema › geometric types", () => {
    it("maps circle to centre-plus-radius object", () => {
      expect(columnToZodSchema(col("circle"))).toBe(
        "z.object({ x: z.number(), y: z.number(), radius: z.number() })",
      );
    });
  });
}
