import { describe, it, expect } from "bun:test";
import { model } from "@/schema";
import { columns } from "@/properties";
import { EnumBuilder } from "@/properties/enum/base";
import { ColumnBuilder } from "@/properties/column/base";

// Small helper: name then schema, since toSchema() reads the column name.
function schemaOf(b: ColumnBuilder, name = "c") {
  (b as unknown as { _setName(n: string): void })._setName(name);
  return b.toSchema();
}
function tsOf(b: ColumnBuilder) {
  (b as unknown as { _setName(n: string): void })._setName("c");
  return b.toTsType();
}

// ─────────────────────────────────────────────────────────────────────────────
// ColumnBuilder.toTsType — nullability, array wrapping, and union parenthesising
// ─────────────────────────────────────────────────────────────────────────────

describe("ColumnBuilder.toTsType › scalar nullability", () => {
  it("non-null scalar is the bare base type", () => {
    expect(tsOf(columns.integer())).toBe("number");
  });
  it("nullable scalar appends | null", () => {
    expect(tsOf(columns.integer().nullable())).toBe("number | null");
  });
  it("text non-null is string", () => {
    expect(tsOf(columns.text())).toBe("string");
  });
});

describe("ColumnBuilder.toTsType › array wrapping", () => {
  it("array wraps the base in Array<>", () => {
    expect(tsOf(columns.text().array())).toBe("Array<string>");
  });
  it("nullable array applies | null after the Array<> wrapper", () => {
    expect(tsOf(columns.text().array().nullable())).toBe("Array<string> | null");
  });
});

describe("ColumnBuilder.toTsType › object-literal base types", () => {
  it("point non-null is its object literal", () => {
    // point isn't exposed via columns.* factory, so build the base directly
    const point = new ColumnBuilder("point");
    expect(tsOf(point)).toBe("{ x: number; y: number }");
  });
  it("point nullable keeps the literal (no top-level union → no parens)", () => {
    const point = new ColumnBuilder("point").nullable();
    expect(tsOf(point)).toBe("{ x: number; y: number } | null");
  });
  it("interval object base nullable does not get parenthesised (no top-level |)", () => {
    expect(tsOf(columns.interval().nullable())).toBe(
      "{ years: number; months: number; days: number; hours: number; minutes: number; seconds: number; milliseconds: number } | null",
    );
  });
  it("interval array wraps the object literal", () => {
    expect(tsOf(columns.interval().array())).toMatch(/^Array<\{ years: number/);
  });
});

describe("ColumnBuilder.toTsType › union base types get parenthesised when nullable", () => {
  // The parens branch fires only when the base has a *top-level* " | " (depth 0).
  // An enum whose TS type is a literal union ("A | B") is exactly that case;
  // a nullable, non-array column must wrap the base in parens to stay valid TS.
  function unionEnumCol(opts: { array?: boolean; nullable?: boolean } = {}) {
    const b = new ColumnBuilder("enum") as ColumnBuilder & {
      _enumTsType?: string;
      _array: boolean;
      _nullable: boolean;
    };
    b._enumTsType = "A | B";
    if (opts.array) b._array = true;
    if (opts.nullable) b._nullable = true;
    return b;
  }

  it("nullable top-level-union base is wrapped in parens before | null", () => {
    expect(tsOf(unionEnumCol({ nullable: true }))).toBe("(A | B) | null");
  });

  it("array top-level-union base does NOT add parens (Array<> already delimits it)", () => {
    expect(tsOf(unionEnumCol({ array: true, nullable: true }))).toBe(
      "Array<A | B> | null",
    );
  });

  it("range base keeps its | inside {} → no top-level union → no parens", () => {
    // The " | null" inside the range object literal is nested (depth > 0),
    // so the parens heuristic correctly leaves it alone.
    const ts = tsOf(new ColumnBuilder("int4range").nullable());
    expect(ts.startsWith("(")).toBe(false);
    expect(ts.endsWith("} | null")).toBe(true);
  });
});

describe("ColumnBuilder.toTsType › enum columns reference the enum name", () => {
  const Status = new EnumBuilder(["a", "b"]).name("Status");
  it("non-null enum is the bare type name (not the expanded union)", () => {
    expect(tsOf(columns.enum(Status))).toBe("Status");
  });
  it("nullable enum appends | null", () => {
    expect(tsOf(columns.enum(Status).nullable())).toBe("Status | null");
  });
  it("array enum wraps the name in Array<>", () => {
    expect(tsOf(columns.enum(Status).array())).toBe("Array<Status>");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ColumnBuilder.toSchema — defaults, flags, fieldName, raw defaults
// ─────────────────────────────────────────────────────────────────────────────

describe("ColumnBuilder.toSchema › defaults and flags", () => {
  it("string default is single-quoted", () => {
    expect(schemaOf(columns.text().default("hi")).default).toBe("'hi'");
  });
  it("numeric default is stringified without quotes", () => {
    expect(schemaOf(columns.integer().default(0)).default).toBe("0");
  });
  it("boolean default is stringified without quotes", () => {
    expect(schemaOf(columns.boolean().default(false)).default).toBe("false");
  });
  it("defaultRaw passes the expression through untouched", () => {
    expect(schemaOf(columns.timestamp().defaultRaw("now()")).default).toBe(
      "now()",
    );
  });
  it("fieldName is emitted when set and omitted otherwise", () => {
    expect(schemaOf(columns.text().fieldName("db_col")).fieldName).toBe(
      "db_col",
    );
    expect("fieldName" in schemaOf(columns.text())).toBe(false);
  });
  it("emits the boolean flag quartet on every column", () => {
    const s = schemaOf(columns.text());
    expect(s.primaryKey).toBe(false);
    expect(s.nullable).toBe(false);
    expect(s.unique).toBe(false);
    expect(s.array).toBe(false);
    expect(s.autoincrement).toBe(false);
  });
  it("primaryKey + unique flags flip independently", () => {
    const s = schemaOf(columns.text().primaryKey().unique());
    expect(s.primaryKey).toBe(true);
    expect(s.unique).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Specialised column builders not exercised in columns.test.ts
// ─────────────────────────────────────────────────────────────────────────────

describe("specialised column builders", () => {
  it("id column with prefix emits a generate_id default and is non-nullable", () => {
    const s = schemaOf(columns.id({ prefix: "usr" }).primaryKey(), "id");
    expect(s.type).toBe("text");
    expect(s.default).toBe("generate_id('usr')");
    expect(s.nullable).toBe(false);
    expect(s.primaryKey).toBe(true);
  });
  it("id column without prefix has no default", () => {
    const s = schemaOf(columns.id(), "id");
    expect(s.default).toBeUndefined();
  });
  it("uuid column maps to uuid type and string TS type", () => {
    expect(schemaOf(columns.uuid()).type).toBe("uuid");
    expect(tsOf(columns.uuid())).toBe("string");
  });
  it("money column maps to money type and string TS type", () => {
    expect(schemaOf(columns.money()).type).toBe("money");
    expect(tsOf(columns.money())).toBe("string");
  });
  it("bytea column maps to bytea type and Buffer TS type", () => {
    expect(schemaOf(columns.bytea()).type).toBe("bytea");
    expect(tsOf(columns.bytea())).toBe("Buffer");
  });
  it("char column carries fixed length", () => {
    expect(schemaOf(columns.char(10)).length).toBe(10);
    expect(schemaOf(columns.char(10)).type).toBe("character");
  });
  it("varchar without length omits length", () => {
    expect(schemaOf(columns.varchar()).length).toBeUndefined();
  });
  it("real and doublePrecision map to number", () => {
    expect(tsOf(columns.real())).toBe("number");
    expect(tsOf(columns.doublePrecision())).toBe("number");
  });
  it("jsonb factory forces binary json (jsonb) type", () => {
    expect(schemaOf(columns.jsonb()).type).toBe("jsonb");
  });
});

describe("vector column", () => {
  it("is a real[] array column whose length records the dimension", () => {
    const s = schemaOf(columns.vector(1536));
    expect(s.type).toBe("real");
    expect(s.array).toBe(true);
    expect(s.length).toBe(1536);
  });
  it("dimensions() mutates the recorded length", () => {
    const b = columns.vector(768).dimensions(384);
    expect(schemaOf(b).length).toBe(384);
  });
  it("nullable vector TS type is Array<number> | null", () => {
    expect(tsOf(columns.vector(3).nullable())).toBe("Array<number> | null");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Model-level auto columns: timestamps + soft delete
// ─────────────────────────────────────────────────────────────────────────────

describe("model auto columns › timestamps + softDelete defaults", () => {
  it("by default appends created_at, updated_at and deleted_at", () => {
    const M = model("auto_default", { id: columns.id().primaryKey() });
    const names = M.toTableSchema().columns.map((c) => c.name);
    expect(names).toEqual(["id", "created_at", "updated_at", "deleted_at"]);
  });

  it("created_at is non-null defaulting to now(); updated_at is nullable", () => {
    const cols = model("auto_ts", {
      id: columns.id().primaryKey(),
    }).toTableSchema().columns;
    const created = cols.find((c) => c.name === "created_at")!;
    const updated = cols.find((c) => c.name === "updated_at")!;
    expect(created.nullable).toBe(false);
    expect(created.default).toBe("now()");
    expect(updated.nullable).toBe(true);
    expect(updated.default).toBeUndefined();
  });

  it("deleted_at is a nullable date with no default", () => {
    const del = model("auto_sd", { id: columns.id().primaryKey() })
      .toTableSchema()
      .columns.find((c) => c.name === "deleted_at")!;
    expect(del.type).toBe("date");
    expect(del.nullable).toBe(true);
    expect(del.default).toBeUndefined();
  });
});

describe("model auto columns › toggles", () => {
  it("timestamps(false) omits created_at/updated_at but keeps deleted_at", () => {
    const names = model("no_ts", { id: columns.id().primaryKey() })
      .timestamps(false)
      .toTableSchema()
      .columns.map((c) => c.name);
    expect(names).toEqual(["id", "deleted_at"]);
  });

  it("softDelete(false) omits deleted_at but keeps timestamps", () => {
    const names = model("no_sd", { id: columns.id().primaryKey() })
      .softDelete(false)
      .toTableSchema()
      .columns.map((c) => c.name);
    expect(names).toEqual(["id", "created_at", "updated_at"]);
  });

  it("softDelete with a custom field name uses that column name", () => {
    const names = model("custom_sd", { id: columns.id().primaryKey() })
      .timestamps(false)
      .softDelete(true, "removed_at")
      .toTableSchema()
      .columns.map((c) => c.name);
    expect(names).toEqual(["id", "removed_at"]);
  });

  it("does not duplicate created_at when the model already declares createdAt", () => {
    const cols = model("explicit_ts", {
      id: columns.id().primaryKey(),
      createdAt: columns.timestamp({ withTimezone: true }).defaultNow(),
    })
      .softDelete(false)
      .toTableSchema().columns;
    // created_at is NOT auto-appended because a createdAt column already exists,
    // but updated_at still is.
    expect(cols.filter((c) => c.name === "created_at")).toHaveLength(0);
    expect(cols.map((c) => c.name)).toContain("createdAt");
    expect(cols.map((c) => c.name)).toContain("updated_at");
  });

  it("does not duplicate deleted_at when the custom field already exists as a column", () => {
    const cols = model("explicit_sd", {
      id: columns.id().primaryKey(),
      deleted_at: columns.timestamp().nullable(),
    })
      .timestamps(false)
      .toTableSchema().columns;
    expect(cols.filter((c) => c.name === "deleted_at")).toHaveLength(1);
  });

  it("toggle methods are chainable (return this)", () => {
    const M = model("chainable", { id: columns.id().primaryKey() });
    expect(M.timestamps(false)).toBe(M);
    expect(M.softDelete(false)).toBe(M);
  });
});
