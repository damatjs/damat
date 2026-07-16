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
  it("wraps then nullifies a nullable array", () => {
    expect(
      columnToTsType(col("integer", { array: true, nullable: true })),
    ).toBe("Array<number> | null");
  });
});
