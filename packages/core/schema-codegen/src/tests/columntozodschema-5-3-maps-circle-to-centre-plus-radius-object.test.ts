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

describe("columnToZodSchema › geometric types", () => {
  it("maps circle to centre-plus-radius object", () => {
    expect(columnToZodSchema(col("circle"))).toBe(
      "z.object({ x: z.number(), y: z.number(), radius: z.number() })",
    );
  });
});
