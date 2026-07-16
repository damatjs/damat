import { describe, it, expect } from "bun:test";
import { ColumnSchema, ColumnType } from "@damatjs/orm-type";
import { columnToZodSchema } from "../columnToZodSchema";

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
