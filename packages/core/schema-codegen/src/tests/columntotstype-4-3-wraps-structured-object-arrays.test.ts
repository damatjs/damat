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

describe("columnToTsType › arrays", () => {
  it("wraps structured object arrays", () => {
    expect(columnToTsType(col("point", { array: true }))).toBe(
      "Array<{ x: number; y: number }>",
    );
    expect(columnToTsType(col("point", { array: true, nullable: true }))).toBe(
      "Array<{ x: number; y: number }> | null",
    );
  });
});
