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

describe("columnToZodSchema › misc scalar types", () => {
  it("maps a bare enum column to z.string() (values handled elsewhere)", () => {
    expect(columnToZodSchema(col("enum"))).toBe("z.string()");
  });
});
