import { ColumnSchema, ColumnType } from "@damatjs/orm-type";
import { columnToZodSchema } from "../../columnToZodSchema";
import { describe, it, expect } from "bun:test";

{
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
    it("maps boolean to z.boolean()", () => {
      expect(columnToZodSchema(col("boolean"))).toBe("z.boolean()");
    });
  });
}

{
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
    it("maps uuid to z.string().uuid()", () => {
      expect(columnToZodSchema(col("uuid"))).toBe("z.string().uuid()");
    });
  });
}

{
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
}

{
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
}
