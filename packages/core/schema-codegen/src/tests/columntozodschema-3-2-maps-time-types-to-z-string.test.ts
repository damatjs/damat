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
  it("maps time types to z.string()", () => {
    expect(columnToZodSchema(col("time without time zone"))).toBe("z.string()");
    expect(columnToZodSchema(col("time with time zone"))).toBe("z.string()");
  });
});
