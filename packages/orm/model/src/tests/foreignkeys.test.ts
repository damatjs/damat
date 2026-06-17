import { describe, it, expect } from "bun:test";
import { model } from "@/schema";
import { columns } from "@/properties";
import { ProductSchema, OrderItemSchema } from "./__fixtures__/models";

// ─────────────────────────────────────────────────────────────────────────────
// belongsTo / foreign keys — column emission, FK constraints, nullability
// ─────────────────────────────────────────────────────────────────────────────

describe("transform › belongsTo / foreign keys", () => {
  it("Product has a category_id FK column", () => {
    const cols = ProductSchema.toTableSchema().columns.map((c) => c.name);
    expect(cols).toContain("category_id");
  });

  it("Product FK column is text type", () => {
    const col = ProductSchema.toTableSchema().columns.find(
      (c) => c.name === "category_id",
    )!;
    expect(col.type).toBe("text");
  });

  it("Product nullable FK column is nullable", () => {
    const col = ProductSchema.toTableSchema().columns.find(
      (c) => c.name === "category_id",
    )!;
    expect(col.nullable).toBe(true);
  });

  it("Product FK constraint references categories table", () => {
    const fk = ProductSchema.toTableSchema().foreignKeys?.find((f) =>
      f.columns.map((c) => c.name).includes("category_id"),
    )!;
    expect(fk.referencedTable).toBe("category");
    expect(fk.referencedColumns).toEqual(["id"]);
  });

  it("nullable FK sets onDelete to SET NULL", () => {
    const fk = ProductSchema.toTableSchema().foreignKeys?.find((f) =>
      f.columns.map((c) => c.name).includes("category_id"),
    )!;
    expect(fk.onDelete).toBe("SET NULL");
  });

  it("non-nullable FK has no onDelete", () => {
    const fk = OrderItemSchema.toTableSchema().foreignKeys?.find((f) =>
      f.columns.map((c) => c.name).includes("order_id"),
    )!;
    expect(fk.onDelete).toBeUndefined();
  });

  it("OrderItem has two FK columns (order_id and product_id)", () => {
    const colNames = OrderItemSchema.toTableSchema().columns.map((c) => c.name);
    expect(colNames).toContain("order_id");
    expect(colNames).toContain("product_id");
  });

  it("OrderItem has two FK constraints", () => {
    expect(OrderItemSchema.toTableSchema().foreignKeys).toHaveLength(2);
  });

  it("FK column name defaults to property name + _id", () => {
    const Author = model("author", { id: columns.id().primaryKey() });
    const Book = model("book", {
      id: columns.id().primaryKey(),
      author: columns.belongsTo(Author),
    });
    const fkColumn = Book.toTableSchema().columns.find(
      (c) => c.name === "author_id",
    );
    expect(fkColumn).toBeDefined();
    expect(fkColumn!.type).toBe("text");
  });

  it("FK column name can be overridden via .link({ foreignKey })", () => {
    const Publisher = model("publishers", { id: columns.id().primaryKey() });
    const Magazine = model("magazines", {
      id: columns.id().primaryKey(),
      publisher: columns.belongsTo(Publisher).link({ foreignKey: "pub_ref" }),
    });
    const schema = Magazine.toTableSchema();
    expect(schema.columns.find((c) => c.name === "pub_ref")).toBeDefined();
    expect(
      schema.columns.find((c) => c.name === "publisher_id"),
    ).toBeUndefined();
  });

  it("belongsTo accepts a string table name without resolving the target model", () => {
    // No model is ever defined for "publishing_houses" — referencing it by
    // table-name string must still produce the FK column, constraint and
    // relation schema without a registry lookup.
    const Book = model("books_str", {
      id: columns.id().primaryKey(),
      publisher: columns.belongsTo("publishing_houses"),
    });
    const schema = Book.toTableSchema();

    // FK column defaults to "<targetTable>_id".
    expect(
      schema.columns.find((c) => c.name === "publishing_houses_id"),
    ).toBeDefined();

    // FK constraint references the string table name directly.
    const fk = schema.foreignKeys?.find((f) =>
      f.columns.map((c) => c.name).includes("publishing_houses_id"),
    )!;
    expect(fk.referencedTable).toBe("publishing_houses");
    expect(fk.referencedColumns).toEqual(["id"]);

    // Relation schema points at the string table name.
    const rel = schema.relations?.find((r) => r.type === "belongsTo")!;
    expect(rel.to).toBe("publishing_houses");
    expect(rel.linkedBy).toEqual(["publishing_houses_id"]);
  });

  it("hasMany does not create a column on the owner side", () => {
    const { UserSchema } = require("./__fixtures__/models");
    const colNames = UserSchema.toTableSchema().columns.map(
      (c: { name: string }) => c.name,
    );
    expect(colNames).not.toContain("orders");
    expect(colNames).not.toContain("orders_id");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// belongsTo with a *string* target — the table is referenced purely by name,
// no model is ever defined or resolved through the registry. Every FK artifact
// (column, constraint, relation schema) must be derived from the string alone.
// This is what enables cross-module relations without importing the target.
// ─────────────────────────────────────────────────────────────────────────────

describe("transform › belongsTo string target", () => {
  it(".link({ foreignKey }) overrides the FK column name", () => {
    const Book = model("books_link", {
      id: columns.id().primaryKey(),
      publisher: columns
        .belongsTo("publishing_houses")
        .link({ foreignKey: "pub_ref" }),
    });
    const schema = Book.toTableSchema();

    expect(schema.columns.find((c) => c.name === "pub_ref")).toBeDefined();
    expect(
      schema.columns.find((c) => c.name === "publishing_houses_id"),
    ).toBeUndefined();

    const fk = schema.foreignKeys?.find((f) =>
      f.columns.map((c) => c.name).includes("pub_ref"),
    )!;
    expect(fk.referencedTable).toBe("publishing_houses");
  });

  it("auto-generates the constraint name from the target table name", () => {
    const Book = model("books_cn", {
      id: columns.id().primaryKey(),
      publisher: columns.belongsTo("publishing_houses"),
    });
    const fk = Book.toTableSchema().foreignKeys?.find(
      (f) => f.referencedTable === "publishing_houses",
    )!;
    expect(fk.name).toBe("publishing_houses_publishing_houses_id_fk");
  });

  it(".nullable() makes the FK column nullable and sets ON DELETE SET NULL", () => {
    const Book = model("books_nl", {
      id: columns.id().primaryKey(),
      publisher: columns.belongsTo("publishing_houses").nullable(),
    });
    const schema = Book.toTableSchema();

    expect(schema.columns.find((c) => c.name === "publishing_houses_id")!.nullable).toBe(
      true,
    );

    const fk = schema.foreignKeys?.find(
      (f) => f.referencedTable === "publishing_houses",
    )!;
    expect(fk.onDelete).toBe("SET NULL");
    expect(fk.nullable).toBe(true);
  });

  it(".unique() + .indexed() set the FK flags", () => {
    const Book = model("books_uq", {
      id: columns.id().primaryKey(),
      publisher: columns.belongsTo("publishing_houses").unique().indexed(),
    });
    const schema = Book.toTableSchema();

    expect(schema.columns.find((c) => c.name === "publishing_houses_id")!.unique).toBe(
      true,
    );

    const fk = schema.foreignKeys?.find(
      (f) => f.referencedTable === "publishing_houses",
    )!;
    expect(fk.unique).toBe(true);
    expect(fk.indexed).toBe(true);
  });

  it("onDelete/onUpdate appear on the relation rule", () => {
    const Book = model("books_rule", {
      id: columns.id().primaryKey(),
      publisher: columns
        .belongsTo("publishing_houses")
        .onDelete("CASCADE")
        .onUpdate("RESTRICT"),
    });
    const rel = Book.toTableSchema().relations?.find(
      (r) => r.type === "belongsTo",
    )!;
    expect(rel.rule?.onDelete).toBe("CASCADE");
    expect(rel.rule?.onUpdate).toBe("RESTRICT");
  });

  it("default mappedBy is derived from the target table name (drops trailing 's')", () => {
    const Book = model("books_mb", {
      id: columns.id().primaryKey(),
      publisher: columns.belongsTo("publishers"),
    });
    const rel = Book.toTableSchema().relations?.find(
      (r) => r.type === "belongsTo",
    )!;
    // "publishers" → "publisher"
    expect(rel.mappedBy).toEqual(["publisher"]);
  });

  it("supports a composite FK referencing the string table", () => {
    const Item = model("items_comp", {
      id: columns.id().primaryKey(),
      product: columns.belongsTo("products").link({
        foreignKey: ["vendor_id", "sku"],
        reference: ["vendor_id", "sku"],
      }),
    });
    const schema = Item.toTableSchema();

    expect(schema.columns.find((c) => c.name === "vendor_id")).toBeDefined();
    expect(schema.columns.find((c) => c.name === "sku")).toBeDefined();

    const fk = schema.foreignKeys?.find((f) => f.referencedTable === "products")!;
    expect(fk.columns.map((c) => c.name)).toEqual(["vendor_id", "sku"]);
    expect(fk.referencedColumns).toEqual(["vendor_id", "sku"]);
  });

  it("toTsType() returns the PascalCased table name", () => {
    expect(columns.belongsTo("publishing_houses").toTsType()).toBe(
      "PublishingHouses",
    );
  });
});
