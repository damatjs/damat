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

describe("columnToTsType › default does not affect type", () => {
  it("ignores the default value when computing the TS type", () => {
    expect(columnToTsType(col("text", { default: "x" }))).toBe("string");
    expect(columnToTsType(col("integer", { default: 0 }))).toBe("number");
  });
});
