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

describe("columnToZodSchema › character types", () => {
  it("maps character types to z.string()", () => {
    for (const t of [
      "text",
      "character",
      "character varying",
      "money",
    ] as const) {
      expect(columnToZodSchema(col(t))).toBe("z.string()");
    }
  });
});
