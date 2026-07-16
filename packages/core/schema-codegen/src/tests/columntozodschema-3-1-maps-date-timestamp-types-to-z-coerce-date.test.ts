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
  it("maps date / timestamp types to z.coerce.date()", () => {
    for (const t of [
      "timestamp without time zone",
      "timestamp with time zone",
      "date",
    ] as const) {
      expect(columnToZodSchema(col(t))).toBe("z.coerce.date()");
    }
  });
});
