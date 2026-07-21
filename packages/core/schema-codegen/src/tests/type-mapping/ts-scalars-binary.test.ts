import { ColumnSchema, ColumnType } from "@damatjs/orm-type";
import { columnToTsType } from "../../columnToTsType";
import { describe, it, expect } from "bun:test";

{
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
    it("maps bytea to Buffer", () => {
      expect(columnToTsType(col("bytea"))).toBe("Buffer");
    });
  });
}

{
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
    it("maps boolean to boolean", () => {
      expect(columnToTsType(col("boolean"))).toBe("boolean");
    });
  });
}
