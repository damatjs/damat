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
  it("maps interval to a structured object", () => {
    expect(columnToTsType(col("interval"))).toBe(
      "{ years: number; months: number; days: number; hours: number; minutes: number; seconds: number; milliseconds: number }",
    );
  });
});
