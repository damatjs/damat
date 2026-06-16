import { describe, it, expect } from "bun:test";
import type {
  ColumnSchema,
  EnumSchema,
  ForeignKeySchema,
  IndexSchema,
} from "@damatjs/orm-type";
import {
  columnsEqual,
  createNameMap,
  foreignKeysEqual,
  indexesEqual,
  nativeEnumsEqual,
} from "../../diff/utils";
import { col } from "../__fixtures__/schemas";

describe("createNameMap", () => {
  it("keys items by their .name by default", () => {
    const map = createNameMap([col("a"), col("b")]);
    expect([...map.keys()]).toEqual(["a", "b"]);
    expect(map.get("a")!.name).toBe("a");
  });

  it("returns an empty map for an empty array", () => {
    expect(createNameMap([]).size).toBe(0);
  });

  it("uses a custom name accessor when provided", () => {
    const map = createNameMap(
      [{ id: "x" }, { id: "y" }],
      (item) => item.id,
    );
    expect([...map.keys()]).toEqual(["x", "y"]);
  });

  it("keeps the last item when names collide", () => {
    const first = col("dup", { type: "integer" });
    const second = col("dup", { type: "bigint" });
    const map = createNameMap([first, second]);
    expect(map.size).toBe(1);
    expect(map.get("dup")!.type).toBe("bigint");
  });
});

describe("columnsEqual", () => {
  const baseline: ColumnSchema = {
    name: "c",
    type: "integer",
    nullable: false,
    primaryKey: false,
    unique: false,
    length: undefined,
    scale: undefined,
    default: undefined,
    array: false,
    enum: undefined,
  };

  it("returns true for structurally identical columns", () => {
    expect(columnsEqual({ ...baseline }, { ...baseline })).toBe(true);
  });

  it.each([
    ["type", { type: "bigint" as const }],
    ["nullable", { nullable: true }],
    ["primaryKey", { primaryKey: true }],
    ["unique", { unique: true }],
    ["length", { length: 10 }],
    ["scale", { scale: 2 }],
    ["default", { default: "0" }],
    ["array", { array: true }],
    ["enum", { enum: "x" }],
  ])("returns false when %s differs", (_label, override) => {
    expect(columnsEqual(baseline, { ...baseline, ...override })).toBe(false);
  });

  it("ignores the column name when comparing", () => {
    expect(columnsEqual(baseline, { ...baseline, name: "other" })).toBe(true);
  });
});

describe("indexesEqual", () => {
  const a: IndexSchema = {
    name: "i",
    columns: ["x", "y"],
    unique: true,
    type: "btree",
    where: undefined,
  };

  it("returns true for equal indexes (name ignored)", () => {
    expect(indexesEqual(a, { ...a, name: "different" })).toBe(true);
  });

  it("returns false when columns differ", () => {
    expect(indexesEqual(a, { ...a, columns: ["x"] })).toBe(false);
  });

  it("returns false when uniqueness differs", () => {
    expect(indexesEqual(a, { ...a, unique: false })).toBe(false);
  });

  it("returns false when the partial WHERE clause differs", () => {
    expect(indexesEqual(a, { ...a, where: "x IS NOT NULL" })).toBe(false);
  });

  it("treats column object ordering as significant", () => {
    expect(indexesEqual(a, { ...a, columns: ["y", "x"] })).toBe(false);
  });
});

describe("foreignKeysEqual", () => {
  const fk: ForeignKeySchema = {
    name: "fk",
    columns: [{ name: "a", type: "text" }],
    referencedTable: "t",
    referencedColumns: ["id"],
    onDelete: "CASCADE",
    onUpdate: undefined,
    deferrable: undefined,
    match: undefined,
  };

  it("returns true for equal FKs (name ignored)", () => {
    expect(foreignKeysEqual(fk, { ...fk, name: "other" })).toBe(true);
  });

  it("returns false when referenced table differs", () => {
    expect(foreignKeysEqual(fk, { ...fk, referencedTable: "u" })).toBe(false);
  });

  it("returns false when onDelete differs", () => {
    expect(foreignKeysEqual(fk, { ...fk, onDelete: "SET NULL" })).toBe(false);
  });

  it("returns false when local columns differ", () => {
    expect(
      foreignKeysEqual(fk, { ...fk, columns: [{ name: "b", type: "text" }] }),
    ).toBe(false);
  });

  it("returns false when referenced columns differ", () => {
    expect(foreignKeysEqual(fk, { ...fk, referencedColumns: ["other"] })).toBe(
      false,
    );
  });
});

describe("nativeEnumsEqual", () => {
  const e: EnumSchema = { name: "e", values: ["a", "b", "c"] };

  it("is order-insensitive", () => {
    const reordered: EnumSchema = { name: "e", values: ["c", "a", "b"] };
    expect(nativeEnumsEqual(e, reordered)).toBe(true);
  });

  it("returns false when value sets differ", () => {
    expect(nativeEnumsEqual(e, { name: "e", values: ["a", "b"] })).toBe(false);
  });

  it("returns false when the schema namespace differs", () => {
    expect(
      nativeEnumsEqual(
        { ...e, schema: "public" },
        { ...e, schema: "store" },
      ),
    ).toBe(false);
  });
});
