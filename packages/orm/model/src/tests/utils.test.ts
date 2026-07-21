import { describe, it, expect } from "bun:test";
import {
  toPascalCase,
  toCamelCase,
  toEnumTypeName,
  removeLastS,
  cleanupIndexSchema,
  pgTypeToTsBase,
  enumTypeToTsBase,
  resolveModuleTarget,
} from "@/utils";
import {
  registerModel,
  getRegisteredModel,
  hasRegisteredModel,
} from "@/utils/registry";
import { model } from "@/schema";
import { columns } from "@/properties";

// ─────────────────────────────────────────────────────────────────────────────
// stringConvertor
// ─────────────────────────────────────────────────────────────────────────────

describe("stringConvertor › toPascalCase", () => {
  it("converts snake_case", () => {
    expect(toPascalCase("order_item")).toBe("OrderItem");
  });
  it("converts kebab-case and spaces, splitting on any run of separators", () => {
    expect(toPascalCase("a-b c")).toBe("ABC");
    expect(toPascalCase("multi__word")).toBe("MultiWord");
  });
  it("capitalises a single lowercase word", () => {
    expect(toPascalCase("user")).toBe("User");
  });
  it("leaves an already-capitalised word as-is for its first char", () => {
    expect(toPascalCase("User")).toBe("User");
  });
});

describe("stringConvertor › toCamelCase", () => {
  it("converts snake_case to camelCase", () => {
    expect(toCamelCase("created_at")).toBe("createdAt");
    expect(toCamelCase("a_b_c")).toBe("aBC");
  });
  it("leaves a word with no underscores unchanged", () => {
    expect(toCamelCase("email")).toBe("email");
  });
  it("only upper-cases letters that directly follow an underscore", () => {
    // a trailing underscore (no following lowercase letter) is left intact
    expect(toCamelCase("name_")).toBe("name_");
  });
});

describe("stringConvertor › toEnumTypeName", () => {
  it("PascalCases and appends Enum suffix", () => {
    expect(toEnumTypeName("product_status")).toBe("ProductStatusEnum");
    expect(toEnumTypeName("orders")).toBe("OrdersEnum");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// target › removeLastS + resolveModuleTarget
// ─────────────────────────────────────────────────────────────────────────────

describe("target › removeLastS", () => {
  it("strips a single trailing s", () => {
    expect(removeLastS("orders")).toBe("order");
    expect(removeLastS("users")).toBe("user");
  });
  it("leaves words without a trailing s untouched", () => {
    expect(removeLastS("category")).toBe("category");
  });
  it("does not strip a single-character 's' (length guard)", () => {
    expect(removeLastS("s")).toBe("s");
  });
  it("strips trailing s even mid-noun (naive, documents behaviour)", () => {
    expect(removeLastS("bus")).toBe("bu");
  });
});

describe("target › resolveModuleTarget", () => {
  it("returns a direct ModelDefinition reference as-is", () => {
    const M = model("res_direct", { id: columns.id().primaryKey() });
    expect(resolveModuleTarget(M)).toBe(M);
  });
  it("invokes a lazy thunk and returns its model", () => {
    const M = model("res_lazy", { id: columns.id().primaryKey() });
    expect(resolveModuleTarget(() => M)).toBe(M);
  });
  it("resolves a string target via the global registry", () => {
    const M = model("res_string", { id: columns.id().primaryKey() });
    expect(resolveModuleTarget("res_string")).toBe(M);
  });
  it("throws a helpful error when a string target is not registered", () => {
    expect(() => resolveModuleTarget("definitely_not_registered")).toThrow(
      /not found in registry/,
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// registry
// ─────────────────────────────────────────────────────────────────────────────

describe("registry", () => {
  it("auto-registers a model on construction (constructor side-effect)", () => {
    model("auto_registered_tbl", { id: columns.id().primaryKey() });
    expect(hasRegisteredModel("auto_registered_tbl")).toBe(true);
    expect(getRegisteredModel("auto_registered_tbl")?._tableName).toBe(
      "auto_registered_tbl",
    );
  });

  it("returns undefined / false for unknown table names", () => {
    expect(getRegisteredModel("__no_such_table__")).toBeUndefined();
    expect(hasRegisteredModel("__no_such_table__")).toBe(false);
  });

  it("registerModel overwrites a previous registration for the same name", () => {
    const a = model("dup_reg_name", { id: columns.id().primaryKey() });
    const b = model("dup_reg_name", { id: columns.id().primaryKey() });
    // last definition wins
    expect(getRegisteredModel("dup_reg_name")).toBe(b);
    registerModel("dup_reg_name", a);
    expect(getRegisteredModel("dup_reg_name")).toBe(a);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// cleanupIndexSchema
// ─────────────────────────────────────────────────────────────────────────────

describe("cleanupIndexSchema", () => {
  it("auto-generates a uniq_ name from table + columns when unnamed and unique", () => {
    const out = cleanupIndexSchema("user", {
      columns: ["email", "name"],
      unique: true,
    });
    expect(out.name).toBe("uniq_user_email_name");
    expect(out.unique).toBe(true);
    expect(out.columns).toEqual([{ name: "email" }, { name: "name" }]);
  });

  it("auto-generates an idx_ name and defaults unique to false", () => {
    const out = cleanupIndexSchema("post", { columns: ["slug"] });
    expect(out.name).toBe("idx_post_slug");
    expect(out.unique).toBe(false);
  });

  it("appends the index number to the generated name when provided", () => {
    const out = cleanupIndexSchema("user", { columns: ["a"] }, 3);
    expect(out.name).toBe("idx_user_a_3");
  });

  it("respects an explicitly provided index name (no generation)", () => {
    const out = cleanupIndexSchema("user", {
      name: "custom_idx",
      columns: ["x"],
      unique: true,
    });
    expect(out.name).toBe("custom_idx");
  });

  it("normalises object columns and preserves the order field", () => {
    const out = cleanupIndexSchema("t", {
      columns: [{ name: "a", order: "DESC" }, "b"],
    });
    expect(out.columns).toEqual([{ name: "a", order: "DESC" }, { name: "b" }]);
  });

  it("drops object columns without an order rather than emitting order:undefined", () => {
    const out = cleanupIndexSchema("t", { columns: [{ name: "a" }] });
    expect(out.columns).toEqual([{ name: "a" }]);
    expect("order" in (out.columns[0] as object)).toBe(false);
  });

  it("passes through type and where when present", () => {
    const out = cleanupIndexSchema("t", {
      columns: ["a"],
      type: "btree",
      where: "a IS NOT NULL",
    });
    expect(out.type).toBe("btree");
    expect(out.where).toBe("a IS NOT NULL");
  });

  it("omits type and where when absent", () => {
    const out = cleanupIndexSchema("t", { columns: ["a"] });
    expect("type" in out).toBe(false);
    expect("where" in out).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// pgTypeToTsBase — representative mappings across every type family
// ─────────────────────────────────────────────────────────────────────────────

describe("pgTypeToTsBase", () => {
  it("maps integer families to number", () => {
    for (const t of ["smallint", "integer", "serial", "smallserial"] as const) {
      expect(pgTypeToTsBase(t)).toBe("number");
    }
  });

  it("maps int8 families to bigint", () => {
    expect(pgTypeToTsBase("bigint")).toBe("bigint");
    expect(pgTypeToTsBase("bigserial")).toBe("bigint");
  });

  it("maps float / exact-numeric to number", () => {
    for (const t of [
      "real",
      "double precision",
      "numeric",
      "decimal",
    ] as const) {
      expect(pgTypeToTsBase(t)).toBe("number");
    }
  });

  it("maps money to string (locale-formatted by the driver)", () => {
    expect(pgTypeToTsBase("money")).toBe("string");
  });

  it("maps character types to string", () => {
    for (const t of ["text", "character", "character varying"] as const) {
      expect(pgTypeToTsBase(t)).toBe("string");
    }
  });

  it("maps bytea to Buffer", () => {
    expect(pgTypeToTsBase("bytea")).toBe("Buffer");
  });

  it("maps date/timestamp to Date but time-of-day to string", () => {
    expect(pgTypeToTsBase("date")).toBe("Date");
    expect(pgTypeToTsBase("timestamp with time zone")).toBe("Date");
    expect(pgTypeToTsBase("timestamp without time zone")).toBe("Date");
    expect(pgTypeToTsBase("time without time zone")).toBe("string");
    expect(pgTypeToTsBase("time with time zone")).toBe("string");
  });

  it("maps boolean to boolean", () => {
    expect(pgTypeToTsBase("boolean")).toBe("boolean");
  });

  it("maps json/jsonb to unknown and jsonpath to string", () => {
    expect(pgTypeToTsBase("json")).toBe("unknown");
    expect(pgTypeToTsBase("jsonb")).toBe("unknown");
    expect(pgTypeToTsBase("jsonpath")).toBe("string");
  });

  it("maps uuid/xml/bit and network types to string", () => {
    for (const t of [
      "uuid",
      "xml",
      "bit",
      "bit varying",
      "cidr",
      "inet",
      "macaddr",
      "macaddr8",
    ] as const) {
      expect(pgTypeToTsBase(t)).toBe("string");
    }
  });

  it("maps geometric object types to their literal object shapes", () => {
    expect(pgTypeToTsBase("point")).toBe("{ x: number; y: number }");
    expect(pgTypeToTsBase("lseg")).toBe(
      "{ x1: number; y1: number; x2: number; y2: number }",
    );
    expect(pgTypeToTsBase("box")).toBe(
      "{ x1: number; y1: number; x2: number; y2: number }",
    );
    expect(pgTypeToTsBase("circle")).toBe(
      "{ x: number; y: number; radius: number }",
    );
    expect(pgTypeToTsBase("polygon")).toBe("string");
  });

  it("maps enum fallback to string", () => {
    expect(pgTypeToTsBase("enum")).toBe("string");
  });

  it("maps interval to its structured object literal", () => {
    expect(pgTypeToTsBase("interval")).toContain("years: number");
    expect(pgTypeToTsBase("interval")).toContain("milliseconds: number");
  });

  it("maps range types with the correct bound element type", () => {
    expect(pgTypeToTsBase("int4range")).toContain("lower: number | null");
    expect(pgTypeToTsBase("int8range")).toContain("lower: bigint | null");
    expect(pgTypeToTsBase("tstzrange")).toContain("lower: Date | null");
  });

  it("maps multirange types to Array<range>", () => {
    expect(pgTypeToTsBase("int4multirange")).toMatch(/^Array<\{/);
    expect(pgTypeToTsBase("datemultirange")).toContain("lower: Date | null");
  });

  it("maps system identifier types", () => {
    expect(pgTypeToTsBase("oid")).toBe("number");
    expect(pgTypeToTsBase("pg_lsn")).toBe("string");
    expect(pgTypeToTsBase("pg_snapshot")).toBe("string");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// enumTypeToTsBase
// ─────────────────────────────────────────────────────────────────────────────

describe("enumTypeToTsBase", () => {
  it("builds a string-literal union from values", () => {
    expect(enumTypeToTsBase(["a", "b", "c"])).toBe("'a' | 'b' | 'c'");
  });
  it("single value produces a single literal (no pipe)", () => {
    expect(enumTypeToTsBase(["only"])).toBe("'only'");
  });
  it("empty array falls back to string", () => {
    expect(enumTypeToTsBase([])).toBe("string");
  });
  it("undefined falls back to string", () => {
    expect(enumTypeToTsBase(undefined)).toBe("string");
  });
});
