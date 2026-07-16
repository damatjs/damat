import { ColumnSchema, ColumnType } from "@damatjs/orm-type";
import { columnToTsType } from "../../columnToTsType";
import { describe, it, expect } from "bun:test";

{
  /** Helper to build a minimal ColumnSchema for a given type. */
  const col = (
    type: ColumnType,
    extra: Partial<ColumnSchema> = {},
  ): ColumnSchema => ({
    name: "c",
    type,
    nullable: false,
    ...extra,
  });

  describe("columnToTsType › nullability", () => {
    it("appends ` | null` for nullable primitives", () => {
      expect(columnToTsType(col("text", { nullable: true }))).toBe(
        "string | null",
      );
      expect(columnToTsType(col("integer", { nullable: true }))).toBe(
        "number | null",
      );
      expect(columnToTsType(col("boolean", { nullable: true }))).toBe(
        "boolean | null",
      );
    });
  });
}

{
  /** Helper to build a minimal ColumnSchema for a given type. */
  const col = (
    type: ColumnType,
    extra: Partial<ColumnSchema> = {},
  ): ColumnSchema => ({
    name: "c",
    type,
    nullable: false,
    ...extra,
  });

  describe("columnToTsType › nullability", () => {
    it("appends ` | null` after a structured object without adding parens", () => {
      // The object's internal ` | ` unions live inside braces (depth > 0), so
      // the needsParens guard does not fire and no extra parens are emitted.
      expect(columnToTsType(col("point", { nullable: true }))).toBe(
        "{ x: number; y: number } | null",
      );
      expect(columnToTsType(col("int4range", { nullable: true }))).toBe(
        "{ lower: number | null; upper: number | null; isLowerBoundClosed: boolean; isUpperBoundClosed: boolean; isEmpty: boolean } | null",
      );
    });
  });
}

{
  /** Helper to build a minimal ColumnSchema for a given type. */
  const col = (
    type: ColumnType,
    extra: Partial<ColumnSchema> = {},
  ): ColumnSchema => ({
    name: "c",
    type,
    nullable: false,
    ...extra,
  });

  describe("columnToTsType › nullability", () => {
    it("does not append ` | null` for non-nullable columns", () => {
      expect(columnToTsType(col("text"))).toBe("string");
      expect(columnToTsType(col("text"))).not.toContain("null");
    });
  });
}
