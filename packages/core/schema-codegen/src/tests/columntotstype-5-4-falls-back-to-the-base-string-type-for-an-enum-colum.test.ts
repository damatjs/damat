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

describe("columnToTsType › enums", () => {
  it("falls back to the base 'string' type for an enum column with no enum name", () => {
    // No `enum` property → not a named enum, so pgTypeToTsBase('enum') = 'string'.
    expect(columnToTsType(col("enum"))).toBe("string");
    expect(columnToTsType(col("enum", { nullable: true }))).toBe(
      "string | null",
    );
  });
});
