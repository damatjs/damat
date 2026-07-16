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
    it("maps integer-family types to number", () => {
      for (const t of [
        "smallint",
        "integer",
        "smallserial",
        "serial",
      ] as const) {
        expect(columnToTsType(col(t))).toBe("number");
      }
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
    it("maps network address types to string", () => {
      for (const t of ["cidr", "inet", "macaddr", "macaddr8"] as const) {
        expect(columnToTsType(col(t))).toBe("string");
      }
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
    it("maps oid to number and pg_lsn / pg_snapshot to string", () => {
      expect(columnToTsType(col("oid"))).toBe("number");
      expect(columnToTsType(col("pg_lsn"))).toBe("string");
      expect(columnToTsType(col("pg_snapshot"))).toBe("string");
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
    it("maps character types to string", () => {
      for (const t of ["text", "character", "character varying"] as const) {
        expect(columnToTsType(col(t))).toBe("string");
      }
    });
  });
}
