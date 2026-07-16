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

  describe("columnToTsType › arrays", () => {
    it("wraps a non-nullable array base in Array<...>", () => {
      expect(columnToTsType(col("text", { array: true }))).toBe(
        "Array<string>",
      );
      expect(columnToTsType(col("integer", { array: true }))).toBe(
        "Array<number>",
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

  describe("columnToTsType › arrays", () => {
    it("wraps then nullifies a nullable array", () => {
      expect(
        columnToTsType(col("integer", { array: true, nullable: true })),
      ).toBe("Array<number> | null");
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

  describe("columnToTsType › arrays", () => {
    it("wraps structured object arrays", () => {
      expect(columnToTsType(col("point", { array: true }))).toBe(
        "Array<{ x: number; y: number }>",
      );
      expect(
        columnToTsType(col("point", { array: true, nullable: true })),
      ).toBe("Array<{ x: number; y: number }> | null");
    });
  });
}
