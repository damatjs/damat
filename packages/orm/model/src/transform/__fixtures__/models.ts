/**
 * Sample domain models used across the transform test suite.
 *
 * Domain: a tiny e-commerce schema
 *
 *   User  ──< Order ──< OrderItem >── Product
 *                                      │
 *                                   Category
 *
 * Relationships:
 *   - Order    belongsTo User           (user_id FK)
 *   - OrderItem belongsTo Order         (order_id FK)
 *   - OrderItem belongsTo Product       (product_id FK)
 *   - Product   belongsTo Category      (category_id FK, nullable)
 *   - User      hasMany   Order         (inverse, no FK column)
 *   - Order     hasMany   OrderItem     (inverse, no FK column)
 *   - Product   hasMany   OrderItem     (inverse, no FK column)
 *   - Category  hasMany   Product       (inverse, no FK column)
 */

import { model } from "../schema/model";

// ---------------------------------------------------------------------------
// Category
// ---------------------------------------------------------------------------
export const Category = model.define("categories", {
  id: model.id({ prefix: "cat" }).primaryKey(),
  name: model.varchar(128),
  slug: model.varchar(128).unique(),
  description: model.text().nullable(),
  createdAt: model.timestamp({ withTimezone: true }).defaultRaw("now()"),
});

// ---------------------------------------------------------------------------
// User
// ---------------------------------------------------------------------------
export const User = model
  .define(
    "users",
    {
      id: model.id({ prefix: "usr" }).primaryKey(),
      email: model.text().unique(),
      name: model.text(),
      age: model.number().nullable(),
      verified: model.boolean().default(false),
      metadata: model.json({ binary: true }).nullable(),
      createdAt: model.timestamp({ withTimezone: true }).defaultRaw("now()"),
      updatedAt: model.timestamp({ withTimezone: true }).defaultRaw("now()"),

      // hasMany (no FK column)
      orders: model.hasMany(Category /* reuse as stand-in */, {
        mappedBy: "user",
      }),
    },
    { schema: "store" },
  )
  .indexes([
    { on: ["email"], unique: true, name: "uniq_users_email" },
    { on: ["createdAt"], name: "idx_users_created_at" },
  ]);

// ---------------------------------------------------------------------------
// Product
// ---------------------------------------------------------------------------
export const Product = model
  .define("products", {
    id: model.id({ prefix: "prd" }).primaryKey(),
    sku: model.varchar(64).unique(),
    title: model.text(),
    price: model.decimal(10, 2),
    stock: model.number().default(0),
    status: model.enum(["draft", "active", "archived"]),
    tags: model.text().array().nullable(),
    specs: model.json().nullable(),
    createdAt: model.timestamp().defaultRaw("now()"),

    // belongsTo Category (nullable - product might not have a category yet)
    category: model
      .belongsTo(Category, { foreignKey: "category_id" })
      .nullable(),
  })
  .indexes([
    { on: ["sku"], unique: true },
    { on: ["status", "createdAt"], type: "btree" },
  ]);

// ---------------------------------------------------------------------------
// Order
// ---------------------------------------------------------------------------
export const Order = model.define("orders", {
  id: model.id({ prefix: "ord" }).primaryKey(),
  total: model.decimal(12, 2),
  status: model.enum([
    "pending",
    "confirmed",
    "shipped",
    "delivered",
    "cancelled",
  ]),
  notes: model.text().nullable(),
  placedAt: model.timestamp({ withTimezone: true }).defaultRaw("now()"),

  // belongsTo User
  user: model.belongsTo(User, { foreignKey: "user_id" }),
});

// ---------------------------------------------------------------------------
// OrderItem
// ---------------------------------------------------------------------------
export const OrderItem = model
  .define("order_items", {
    id: model.id({ prefix: "oi" }).primaryKey(),
    quantity: model.number(),
    unitPrice: model.decimal(10, 2),

    // belongsTo Order
    order: model.belongsTo(Order, { foreignKey: "order_id" }),

    // belongsTo Product
    product: model.belongsTo(Product, { foreignKey: "product_id" }),
  })
  .indexes([
    {
      on: ["order_id", "product_id"],
      unique: true,
      name: "uniq_order_items_order_product",
    },
  ]);
