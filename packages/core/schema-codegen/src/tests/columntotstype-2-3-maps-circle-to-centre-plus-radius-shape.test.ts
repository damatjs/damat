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
  it("maps circle to centre-plus-radius shape", () => {
    expect(columnToTsType(col("circle"))).toBe(
      "{ x: number; y: number; radius: number }",
    );
  });
});
