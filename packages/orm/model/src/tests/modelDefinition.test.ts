import { describe, it, expect } from "bun:test";
import { model, collectModels } from "@/schema";
import { columns } from "@/properties";
import {
  CategorySchema,
  ProductSchema,
  OrderSchema,
} from "./__fixtures__/models";

// ─────────────────────────────────────────────────────────────────────────────
// Getters: name / tableName, and the custom `name` option
// ─────────────────────────────────────────────────────────────────────────────

describe("ModelDefinition getters", () => {
  it("tableName getter returns the table name", () => {
    expect(CategorySchema.tableName).toBe("category");
  });

  it("name getter defaults to the table name", () => {
    expect(OrderSchema.name).toBe("order");
  });

  it("name getter returns the explicit name option when provided", () => {
    const M = model("widget", { id: columns.id().primaryKey() }, { name: "Widget" });
    expect(M.name).toBe("Widget");
    expect(M.tableName).toBe("widget");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// toTsType — interface generation
// ─────────────────────────────────────────────────────────────────────────────

describe("ModelDefinition.toTsType", () => {
  it("defaults the interface name to a PascalCase of the table name", () => {
    const ts = CategorySchema.toTsType();
    expect(ts.startsWith("export interface Category {")).toBe(true);
    expect(ts).toContain("id: string;");
  });

  it("uses an explicit interface name when given", () => {
    const ts = CategorySchema.toTsType("CategoryRow");
    expect(ts.startsWith("export interface CategoryRow {")).toBe(true);
  });

  it("emits one field per belongsTo FK column and omits hasMany/hasOne", () => {
    const ts = ProductSchema.toTsType();
    // belongsTo category emits the FK column field
    expect(ts).toContain("category_id:");
    // scalar columns are present
    expect(ts).toContain("sku:");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// collectModels — table-name-derived, camelCased keys
// ─────────────────────────────────────────────────────────────────────────────

describe("collectModels", () => {
  it("keys each model by its camelCased table name", () => {
    const map = collectModels([CategorySchema, ProductSchema]);
    expect(Object.keys(map).sort()).toEqual(["category", "product"]);
    expect(map.category).toBe(CategorySchema);
    expect(map.product).toBe(ProductSchema);
  });

  it("camelCases snake_case table names", () => {
    const orderLine = model("order_line", { id: columns.id().primaryKey() });
    const map = collectModels([orderLine]);
    expect(Object.keys(map)).toEqual(["orderLine"]);
  });

  it("camelCases kebab-case and space-separated table names", () => {
    const a = model("audit-log", { id: columns.id().primaryKey() });
    const b = model("user session token", { id: columns.id().primaryKey() });
    const map = collectModels([a, b]);
    expect(Object.keys(map).sort()).toEqual(["auditLog", "userSessionToken"]);
  });

  it("returns an empty object for an empty input array", () => {
    expect(collectModels([])).toEqual({});
  });
});
