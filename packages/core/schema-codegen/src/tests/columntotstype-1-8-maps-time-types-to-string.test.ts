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

describe("columnToTsType › primitive base mappings", () => {
  it("maps time types to string", () => {
    expect(columnToTsType(col("time without time zone"))).toBe("string");
    expect(columnToTsType(col("time with time zone"))).toBe("string");
  });
});
