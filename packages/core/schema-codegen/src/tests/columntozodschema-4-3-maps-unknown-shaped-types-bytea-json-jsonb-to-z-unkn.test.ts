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
  it("maps unknown-shaped types (bytea, json, jsonb) to z.unknown()", () => {
    for (const t of ["bytea", "json", "jsonb"] as const) {
      expect(columnToZodSchema(col(t))).toBe("z.unknown()");
    }
  });
});
