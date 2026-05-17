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

  it("hasMany does not create a column on the owner side", () => {
    const { UserSchema } = require("./__fixtures__/models");
    const colNames = UserSchema.toTableSchema().columns.map(
      (c: { name: string }) => c.name,
    );
    expect(colNames).not.toContain("orders");
    expect(colNames).not.toContain("orders_id");
  });
});
