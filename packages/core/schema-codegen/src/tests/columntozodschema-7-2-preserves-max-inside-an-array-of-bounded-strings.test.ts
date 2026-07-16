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

describe("columnToZodSchema › arrays", () => {
  it("preserves .max() inside an array of bounded strings", () => {
    expect(columnToZodSchema(col("text", { array: true, length: 50 }))).toBe(
      "z.array(z.string().max(50))",
    );
  });
});
