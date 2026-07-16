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
    it("maps uuid, xml and bit strings to string", () => {
      for (const t of [
        "uuid",
        "xml",
        "bit",
        "bit varying",
        "jsonpath",
      ] as const) {
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
    it("maps floating point and exact numeric to number", () => {
      for (const t of [
        "real",
        "double precision",
        "numeric",
        "decimal",
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
    it("maps timestamp / date types to Date", () => {
      for (const t of [
        "timestamp without time zone",
        "timestamp with time zone",
        "date",
      ] as const) {
        expect(columnToTsType(col(t))).toBe("Date");
      }
    });
  });
}
