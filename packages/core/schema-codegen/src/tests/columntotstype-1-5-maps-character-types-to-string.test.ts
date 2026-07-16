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
  it("maps character types to string", () => {
    for (const t of ["text", "character", "character varying"] as const) {
      expect(columnToTsType(col(t))).toBe("string");
    }
  });
});
