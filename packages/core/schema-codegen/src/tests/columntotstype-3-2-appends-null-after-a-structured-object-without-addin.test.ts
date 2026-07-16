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
