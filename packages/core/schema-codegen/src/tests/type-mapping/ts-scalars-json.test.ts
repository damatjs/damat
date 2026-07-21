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
    it("maps json / jsonb to unknown", () => {
      expect(columnToTsType(col("json"))).toBe("unknown");
      expect(columnToTsType(col("jsonb"))).toBe("unknown");
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
    it("maps bigint / bigserial to bigint", () => {
      expect(columnToTsType(col("bigint"))).toBe("bigint");
      expect(columnToTsType(col("bigserial"))).toBe("bigint");
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
    it("maps money to string", () => {
      expect(columnToTsType(col("money"))).toBe("string");
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
    it("maps time types to string", () => {
      expect(columnToTsType(col("time without time zone"))).toBe("string");
      expect(columnToTsType(col("time with time zone"))).toBe("string");
    });
  });
}
