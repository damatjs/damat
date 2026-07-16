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
  it("maps floating point and exact numeric to z.number()", () => {
    for (const t of [
      "real",
      "double precision",
      "numeric",
      "decimal",
    ] as const) {
      expect(columnToZodSchema(col(t))).toBe("z.number()");
    }
  });
});
