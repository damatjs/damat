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
  it("maps point to z.object with x/y", () => {
    expect(columnToZodSchema(col("point"))).toBe(
      "z.object({ x: z.number(), y: z.number() })",
    );
  });
});
