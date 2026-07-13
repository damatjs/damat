import { describe, it, expect } from "bun:test";
import type { ColumnSchema } from "@damatjs/orm-type";
import {
  columnDefinitionSql,
  columnTypeSql,
  qualifiedTable,
  quoteIdentifier,
  resolveSchema,
} from "../../sqlGenerator/utils";

describe("quoteIdentifier", () => {
  it("double-quotes a plain identifier", () => {
    expect(quoteIdentifier("user")).toBe('"user"');
  });

  it("escapes embedded double quotes by doubling them", () => {
    expect(quoteIdentifier('we"ird')).toBe('"we""ird"');
  });
});

describe("qualifiedTable", () => {
  it("produces a schema-qualified, quoted identifier", () => {
    expect(qualifiedTable("user", "public")).toBe('"public"."user"');
  });

  it("quotes both schema and table independently", () => {
    expect(qualifiedTable("My Table", "My Schema")).toBe(
      '"My Schema"."My Table"',
    );
  });
});

describe("resolveSchema", () => {
  it("prefers the explicit option schema", () => {
    expect(resolveSchema({ schema: "store" }, "fallback")).toBe("store");
  });

  it("falls back to the table schema when no option set", () => {
    expect(resolveSchema({}, "tableSchema")).toBe("tableSchema");
  });

  it("defaults to public when nothing provided", () => {
    expect(resolveSchema({})).toBe("public");
  });
});

describe("columnTypeSql", () => {
  it("uppercases a simple scalar type", () => {
    expect(columnTypeSql({ name: "x", type: "integer", nullable: false })).toBe(
      "INTEGER",
    );
  });

  it("renders character varying with length", () => {
    expect(
      columnTypeSql({
        name: "x",
        type: "character varying",
        length: 128,
        nullable: false,
      }),
    ).toBe("CHARACTER VARYING(128)");
  });

  it("renders character varying without length", () => {
    expect(
      columnTypeSql({ name: "x", type: "character varying", nullable: false }),
    ).toBe("CHARACTER VARYING");
  });

  it("renders numeric with precision and scale", () => {
    expect(
      columnTypeSql({
        name: "x",
        type: "numeric",
        length: 10,
        scale: 2,
        nullable: false,
      }),
    ).toBe("NUMERIC(10, 2)");
  });

  it("renders numeric with precision only", () => {
    expect(
      columnTypeSql({
        name: "x",
        type: "numeric",
        length: 10,
        nullable: false,
      }),
    ).toBe("NUMERIC(10)");
  });

  it("renders bare NUMERIC when no precision", () => {
    expect(columnTypeSql({ name: "x", type: "numeric", nullable: false })).toBe(
      "NUMERIC",
    );
  });

  it("maps decimal to NUMERIC", () => {
    expect(
      columnTypeSql({
        name: "x",
        type: "decimal",
        length: 5,
        scale: 1,
        nullable: false,
      }),
    ).toBe("NUMERIC(5, 1)");
  });

  it("appends [] for an array column", () => {
    expect(
      columnTypeSql({
        name: "x",
        type: "text",
        array: true,
        nullable: false,
      }),
    ).toBe("TEXT[]");
  });

  it("references a named enum type by quoted identifier", () => {
    expect(
      columnTypeSql({
        name: "x",
        type: "enum",
        enum: "user_status",
        nullable: false,
      }),
    ).toBe('"user_status"');
  });

  it("references an array of a named enum type", () => {
    expect(
      columnTypeSql({
        name: "x",
        type: "enum",
        enum: "user_status",
        array: true,
        nullable: false,
      }),
    ).toBe('"user_status"[]');
  });
});

describe("columnDefinitionSql", () => {
  it("emits a NOT NULL non-nullable column", () => {
    const c: ColumnSchema = { name: "name", type: "text", nullable: false };
    expect(columnDefinitionSql(c)).toBe('"name" TEXT NOT NULL');
  });

  it("emits a NULL nullable column", () => {
    const c: ColumnSchema = { name: "age", type: "integer", nullable: true };
    expect(columnDefinitionSql(c)).toBe('"age" INTEGER NULL');
  });

  it("emits PRIMARY KEY and omits NULL/NOT NULL for a single PK", () => {
    const c: ColumnSchema = {
      name: "id",
      type: "text",
      primaryKey: true,
      nullable: false,
    };
    expect(columnDefinitionSql(c)).toBe('"id" TEXT PRIMARY KEY');
  });

  it("skips the PRIMARY KEY keyword when skipPrimaryKey is set (composite PK)", () => {
    const c: ColumnSchema = {
      name: "id",
      type: "text",
      primaryKey: true,
      nullable: false,
    };
    // When part of a composite PK, the column reverts to NOT NULL inline.
    expect(columnDefinitionSql(c, true)).toBe('"id" TEXT NOT NULL');
  });

  it("appends UNIQUE and DEFAULT in order", () => {
    const c: ColumnSchema = {
      name: "email",
      type: "text",
      nullable: false,
      unique: true,
      default: "'x'",
    };
    expect(columnDefinitionSql(c)).toBe(
      `"email" TEXT NOT NULL UNIQUE DEFAULT 'x'`,
    );
  });

  it("includes a DEFAULT even when its value is the string '0'", () => {
    const c: ColumnSchema = {
      name: "n",
      type: "integer",
      nullable: false,
      default: "0",
    };
    expect(columnDefinitionSql(c)).toBe('"n" INTEGER NOT NULL DEFAULT 0');
  });
});
