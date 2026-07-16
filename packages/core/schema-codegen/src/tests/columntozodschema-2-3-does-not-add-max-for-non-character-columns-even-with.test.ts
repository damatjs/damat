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
  it("does not add .max() for non-character columns even with a length", () => {
    // length only influences character types
    expect(columnToZodSchema(col("integer", { length: 5 }))).toBe(
      "z.number().int()",
    );
  });
});
