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

describe("columnToZodSchema › range and multirange types", () => {
  it("maps numeric multiranges to z.array of the range object", () => {
    expect(columnToZodSchema(col("int4multirange"))).toBe(
      "z.array(z.object({ lower: z.number().nullable(), upper: z.number().nullable(), isLowerBoundClosed: z.boolean(), isUpperBoundClosed: z.boolean(), isEmpty: z.boolean() }))",
    );
  });
});
