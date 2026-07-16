import { describe, it, expect } from "bun:test";
import { ColumnSchema, ColumnType } from "@damatjs/orm-type";
import { columnToTsType } from "../columnToTsType";

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
