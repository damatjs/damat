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

describe("columnToZodSchema › temporal types", () => {
  it("maps interval to a structured z.object", () => {
    expect(columnToZodSchema(col("interval"))).toBe(
      "z.object({ years: z.number(), months: z.number(), days: z.number(), hours: z.number(), minutes: z.number(), seconds: z.number(), milliseconds: z.number() })",
    );
  });
});
