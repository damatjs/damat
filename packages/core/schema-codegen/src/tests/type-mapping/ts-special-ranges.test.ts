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

  describe("columnToTsType › structured object base mappings", () => {
    it("maps circle to centre-plus-radius shape", () => {
      expect(columnToTsType(col("circle"))).toBe(
        "{ x: number; y: number; radius: number }",
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

  describe("columnToTsType › structured object base mappings", () => {
    it("maps line / path / polygon to string", () => {
      for (const t of ["line", "path", "polygon"] as const) {
        expect(columnToTsType(col(t))).toBe("string");
      }
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

  describe("columnToTsType › structured object base mappings", () => {
    it("maps interval to a structured object", () => {
      expect(columnToTsType(col("interval"))).toBe(
        "{ years: number; months: number; days: number; hours: number; minutes: number; seconds: number; milliseconds: number }",
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

  describe("columnToTsType › structured object base mappings", () => {
    it("maps int8range to a bigint-bounded range object", () => {
      expect(columnToTsType(col("int8range"))).toBe(
        "{ lower: bigint | null; upper: bigint | null; isLowerBoundClosed: boolean; isUpperBoundClosed: boolean; isEmpty: boolean }",
      );
    });
  });
}
