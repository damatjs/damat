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
    it("maps lseg and box to the four-coordinate shape", () => {
      const shape = "{ x1: number; y1: number; x2: number; y2: number }";
      expect(columnToTsType(col("lseg"))).toBe(shape);
      expect(columnToTsType(col("box"))).toBe(shape);
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
    it("maps int4range / numrange to number-bounded range objects", () => {
      const shape =
        "{ lower: number | null; upper: number | null; isLowerBoundClosed: boolean; isUpperBoundClosed: boolean; isEmpty: boolean }";
      expect(columnToTsType(col("int4range"))).toBe(shape);
      expect(columnToTsType(col("numrange"))).toBe(shape);
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
    it("maps date/timestamp ranges to Date-bounded range objects", () => {
      const shape =
        "{ lower: Date | null; upper: Date | null; isLowerBoundClosed: boolean; isUpperBoundClosed: boolean; isEmpty: boolean }";
      for (const t of ["tsrange", "tstzrange", "daterange"] as const) {
        expect(columnToTsType(col(t))).toBe(shape);
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
    it("maps multirange types to arrays of their range object", () => {
      expect(columnToTsType(col("int4multirange"))).toBe(
        "Array<{ lower: number | null; upper: number | null; isLowerBoundClosed: boolean; isUpperBoundClosed: boolean; isEmpty: boolean }>",
      );
      expect(columnToTsType(col("int8multirange"))).toBe(
        "Array<{ lower: bigint | null; upper: bigint | null; isLowerBoundClosed: boolean; isUpperBoundClosed: boolean; isEmpty: boolean }>",
      );
      expect(columnToTsType(col("tsmultirange"))).toBe(
        "Array<{ lower: Date | null; upper: Date | null; isLowerBoundClosed: boolean; isUpperBoundClosed: boolean; isEmpty: boolean }>",
      );
    });
  });
}
