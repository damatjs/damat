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

  describe("columnToZodSchema › unmatched types", () => {
    it("falls back to z.unknown() for a type the switch does not cover", () => {
      expect(columnToZodSchema(col("not_a_real_type" as ColumnType))).toBe(
        "z.unknown()",
      );
    });
  });
}
