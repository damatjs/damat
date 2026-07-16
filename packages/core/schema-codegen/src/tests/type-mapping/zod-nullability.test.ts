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

  describe("columnToZodSchema › nullability is NOT applied here", () => {
    it("does not add .nullable()/.optional() regardless of the nullable flag", () => {
      // Those modifiers are appended by the schema generators, not by this fn.
      expect(columnToZodSchema(col("text", { nullable: true }))).toBe(
        "z.string()",
      );
      expect(columnToZodSchema(col("integer", { nullable: true }))).toBe(
        "z.number().int()",
      );
    });
  });
}
