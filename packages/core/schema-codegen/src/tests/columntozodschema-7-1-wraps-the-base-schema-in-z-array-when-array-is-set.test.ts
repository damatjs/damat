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
  it("wraps the base schema in z.array() when array is set", () => {
    expect(columnToZodSchema(col("text", { array: true }))).toBe(
      "z.array(z.string())",
    );
    expect(columnToZodSchema(col("integer", { array: true }))).toBe(
      "z.array(z.number().int())",
    );
    expect(columnToZodSchema(col("uuid", { array: true }))).toBe(
      "z.array(z.string().uuid())",
    );
  });
});
