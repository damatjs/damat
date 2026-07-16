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
  it("wraps a non-nullable array base in Array<...>", () => {
    expect(columnToTsType(col("text", { array: true }))).toBe("Array<string>");
    expect(columnToTsType(col("integer", { array: true }))).toBe(
      "Array<number>",
    );
  });
});
