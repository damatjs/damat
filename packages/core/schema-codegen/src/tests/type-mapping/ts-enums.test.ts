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

  describe("columnToTsType › enums", () => {
    it("resolves a named enum to its PascalCase + Enum-suffixed alias", () => {
      expect(columnToTsType(col("enum", { enum: "status_type" }))).toBe(
        "StatusTypeEnum",
      );
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

  describe("columnToTsType › enums", () => {
    it("supports nullable named enums", () => {
      expect(
        columnToTsType(col("enum", { enum: "status_type", nullable: true })),
      ).toBe("StatusTypeEnum | null");
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

  describe("columnToTsType › enums", () => {
    it("supports enum arrays (nullable and non-nullable)", () => {
      expect(
        columnToTsType(col("enum", { enum: "status_type", array: true })),
      ).toBe("Array<StatusTypeEnum>");
      expect(
        columnToTsType(
          col("enum", { enum: "status_type", array: true, nullable: true }),
        ),
      ).toBe("Array<StatusTypeEnum> | null");
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

  describe("columnToTsType › enums", () => {
    it("falls back to the base 'string' type for an enum column with no enum name", () => {
      // No `enum` property → not a named enum, so pgTypeToTsBase('enum') = 'string'.
      expect(columnToTsType(col("enum"))).toBe("string");
      expect(columnToTsType(col("enum", { nullable: true }))).toBe(
        "string | null",
      );
    });
  });
}
