// /**
//  * Sample domain models used across the transform test suite.
//  *
//  * Domain: a tiny e-commerce schema
//  *
//  *   User  ──< Order ──< OrderItem >── Product
//  *                                      │
//  *                                   Category
//  *
//  * Relationships:
//  *   - Order    belongsTo User           (user_id FK)
//  *   - OrderItem belongsTo Order         (order_id FK)
//  *   - OrderItem belongsTo Product       (product_id FK)
//  *   - Product   belongsTo Category      (category_id FK, nullable)
//  *   - User      hasMany   Order         (inverse, no FK column)
//  *   - Order     hasMany   OrderItem     (inverse, no FK column)
//  *   - Product   hasMany   OrderItem     (inverse, no FK column)
//  *   - Category  hasMany   Product       (inverse, no FK column)
//  */

import { model } from "@/schema";
import { EnumBuilder } from "../../properties/enum/base";
import { columns } from "@/properties";

// ---------------------------------------------------------------------------
// Order
// ---------------------------------------------------------------------------

export const OrderStatusEnum = new EnumBuilder([
  "pending",
  "confirmed",
  "shipped",
  "delivered",
  "cancelled",
]).name("orders");

export const OrderSchema = model("order", {
  id: columns.id({ prefix: "ord" }).primaryKey(),
  total: columns.numeric(12, 2),
  status: columns.enum(OrderStatusEnum),
  notes: columns.text().nullable(),
  placedAt: columns.timestamp({ withTimezone: true }).defaultNow(),
  // User relation will be added after UserSchema is defined to avoid circular dependency
})
  .constrain([
    columns.constrains().check("total > 0").columns(["total"]),
    // columns
    //   .constrains()
    //   .exclude([{ column: "total", operator: "< 0" }])
    //   .columns(["total"]).indexType("gist")
  ])
  .indexes([columns.indexes().columns(["total"]).type("btree")]);

export function getOrderTableSchema() {
  return OrderSchema.toTableSchema();
}
