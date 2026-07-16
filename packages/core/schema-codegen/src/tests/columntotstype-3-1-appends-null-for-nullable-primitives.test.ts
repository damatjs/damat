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
  it("appends ` | null` for nullable primitives", () => {
    expect(columnToTsType(col("text", { nullable: true }))).toBe(
      "string | null",
    );
    expect(columnToTsType(col("integer", { nullable: true }))).toBe(
      "number | null",
    );
    expect(columnToTsType(col("boolean", { nullable: true }))).toBe(
      "boolean | null",
    );
  });
});
