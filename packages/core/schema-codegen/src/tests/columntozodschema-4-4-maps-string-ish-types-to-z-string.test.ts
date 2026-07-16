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
  it("maps string-ish types to z.string()", () => {
    for (const t of [
      "jsonpath",
      "xml",
      "bit",
      "bit varying",
      "cidr",
      "inet",
      "macaddr",
      "macaddr8",
      "tsvector",
      "tsquery",
      "line",
      "path",
      "polygon",
      "pg_lsn",
      "pg_snapshot",
    ] as const) {
      expect(columnToZodSchema(col(t))).toBe("z.string()");
    }
  });
});
