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
  it("maps oid to number and pg_lsn / pg_snapshot to string", () => {
    expect(columnToTsType(col("oid"))).toBe("number");
    expect(columnToTsType(col("pg_lsn"))).toBe("string");
    expect(columnToTsType(col("pg_snapshot"))).toBe("string");
  });
});
