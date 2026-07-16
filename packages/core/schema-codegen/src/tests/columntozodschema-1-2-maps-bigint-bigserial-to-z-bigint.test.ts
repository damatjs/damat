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

describe("columnToZodSchema › numeric types", () => {
  it("maps bigint / bigserial to z.bigint()", () => {
    expect(columnToZodSchema(col("bigint"))).toBe("z.bigint()");
    expect(columnToZodSchema(col("bigserial"))).toBe("z.bigint()");
  });
});
