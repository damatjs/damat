import { describe, it, expect } from "bun:test";
import { model } from "@/schema";
import { columns } from "@/properties";
import {
  CategorySchema,
  UserSchema,
  ProductSchema,
  OrderItemSchema,
} from "./__fixtures__/models";

// ─────────────────────────────────────────────────────────────────────────────
// Indexes — named, unique, composite, auto-generated names
// ─────────────────────────────────────────────────────────────────────────────

describe("transform › indexes", () => {
  it("User has two indexes", () => {
    expect(UserSchema.toTableSchema().indexes).toHaveLength(2);
  });

  it("named unique index is emitted correctly", () => {
    const idx = UserSchema.toTableSchema().indexes?.find(
      (i) => i.name === "uniq_users_email",
    )!;
    expect(idx.unique).toBe(true);
    expect((idx.columns[0] as { name: string }).name).toBe("email");
  });

  it("named non-unique index is emitted correctly", () => {
    const idx = UserSchema.toTableSchema().indexes?.find(
      (i) => i.name === "idx_users_created_at",
    )!;
    expect(idx.unique).toBe(false);
  });

  it("product sku unique index is emitted with the provided name", () => {
    const idx = ProductSchema.toTableSchema().indexes?.find((i) =>
      (i.columns as { name: string }[]).some((c) => c.name === "sku"),
    )!;
    expect(idx.unique).toBe(true);
    expect(idx.name).toBe("product_sku");
  });

  it("multi-column index lists columns in order with btree type", () => {
    const idx = ProductSchema.toTableSchema().indexes?.find((i) =>
      (i.columns as { name: string }[]).some((c) => c.name === "status"),
    )!;
    expect((idx.columns as { name: string }[]).map((c) => c.name)).toEqual([
      "status",
      "createdAt",
    ]);
    expect(idx.type).toBe("btree");
  });

  it("OrderItem has a named composite unique index", () => {
    const idx = OrderItemSchema.toTableSchema().indexes?.find(
      (i) => i.name === "uniq_order_items_order_product",
    )!;
    expect(idx.unique).toBe(true);
    expect((idx.columns as { name: string }[]).map((c) => c.name)).toEqual([
      "order_id",
      "product_id",
    ]);
  });

  it("no indexes when none are defined", () => {
    expect(CategorySchema.toTableSchema().indexes).toHaveLength(0);
  });

  it("auto-generated index name is derived from table and column names", () => {
    const T = model("things", {
      id: columns.id().primaryKey(),
      code: columns.text().unique(),
    }).indexes([columns.indexes().columns(["code"]).unique()]);
    const idx = T.toTableSchema().indexes?.[0]!;
    expect(idx.name).toBeDefined();
    expect(idx.unique).toBe(true);
  });
});
