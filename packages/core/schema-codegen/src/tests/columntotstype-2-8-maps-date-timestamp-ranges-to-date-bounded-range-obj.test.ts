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
  it("maps date/timestamp ranges to Date-bounded range objects", () => {
    const shape =
      "{ lower: Date | null; upper: Date | null; isLowerBoundClosed: boolean; isUpperBoundClosed: boolean; isEmpty: boolean }";
    for (const t of ["tsrange", "tstzrange", "daterange"] as const) {
      expect(columnToTsType(col(t))).toBe(shape);
    }
  });
});
