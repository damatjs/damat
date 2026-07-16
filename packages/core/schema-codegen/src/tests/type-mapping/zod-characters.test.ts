import { ColumnSchema, ColumnType } from "@damatjs/orm-type";
import { columnToZodSchema } from "../../columnToZodSchema";
import { describe, it, expect } from "bun:test";

{
  const col = (
    type: ColumnType,
    extra: Partial<ColumnSchema> = {},
  ): ColumnSchema => ({
    name: "c",
    type,
    nullable: false,
    ...extra,
  });

  describe("columnToZodSchema › character types", () => {
    it("maps character types to z.string()", () => {
      for (const t of [
        "text",
        "character",
        "character varying",
        "money",
      ] as const) {
        expect(columnToZodSchema(col(t))).toBe("z.string()");
      }
    });
  });
}

{
  const col = (
    type: ColumnType,
    extra: Partial<ColumnSchema> = {},
  ): ColumnSchema => ({
    name: "c",
    type,
    nullable: false,
    ...extra,
  });

  describe("columnToZodSchema › character types", () => {
    it("adds .max() when a length is set on a character column", () => {
      expect(columnToZodSchema(col("text", { length: 255 }))).toBe(
        "z.string().max(255)",
      );
      expect(columnToZodSchema(col("character varying", { length: 10 }))).toBe(
        "z.string().max(10)",
      );
    });
  });
}

{
  const col = (
    type: ColumnType,
    extra: Partial<ColumnSchema> = {},
  ): ColumnSchema => ({
    name: "c",
    type,
    nullable: false,
    ...extra,
  });

  describe("columnToZodSchema › character types", () => {
    it("does not add .max() for non-character columns even with a length", () => {
      // length only influences character types
      expect(columnToZodSchema(col("integer", { length: 5 }))).toBe(
        "z.number().int()",
      );
    });
  });
}
