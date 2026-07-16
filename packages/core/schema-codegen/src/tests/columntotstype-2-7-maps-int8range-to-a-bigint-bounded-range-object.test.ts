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
  it("maps int8range to a bigint-bounded range object", () => {
    expect(columnToTsType(col("int8range"))).toBe(
      "{ lower: bigint | null; upper: bigint | null; isLowerBoundClosed: boolean; isUpperBoundClosed: boolean; isEmpty: boolean }",
    );
  });
});
