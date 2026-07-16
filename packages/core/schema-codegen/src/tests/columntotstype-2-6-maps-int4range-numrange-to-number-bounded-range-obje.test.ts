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
  it("maps int4range / numrange to number-bounded range objects", () => {
    const shape =
      "{ lower: number | null; upper: number | null; isLowerBoundClosed: boolean; isUpperBoundClosed: boolean; isEmpty: boolean }";
    expect(columnToTsType(col("int4range"))).toBe(shape);
    expect(columnToTsType(col("numrange"))).toBe(shape);
  });
});
