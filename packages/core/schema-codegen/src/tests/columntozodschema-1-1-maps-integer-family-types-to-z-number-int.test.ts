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
  it("maps integer-family types to z.number().int()", () => {
    for (const t of [
      "smallint",
      "integer",
      "smallserial",
      "serial",
      "oid",
    ] as const) {
      expect(columnToZodSchema(col(t))).toBe("z.number().int()");
    }
  });
});
