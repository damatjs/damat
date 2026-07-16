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
  it("maps lseg and box to the four-coordinate shape", () => {
    const shape = "{ x1: number; y1: number; x2: number; y2: number }";
    expect(columnToTsType(col("lseg"))).toBe(shape);
    expect(columnToTsType(col("box"))).toBe(shape);
  });
});
