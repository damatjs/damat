import { describe, it, expect } from "bun:test";
import { toModuleSchema } from "@/schema/toModuleSchema";
import { ModuleSchema } from "@/types";
import {
  CategorySchema,
  OrderSchema,
  OrderItemSchema,
  ProductSchema,
  UserSchema,
} from "./__fixtures__/models";
import { OrderStatusEnum } from "./__fixtures__/order";
import { ProductStatusEnum } from "./__fixtures__/product";

// The committed snapshot below is a *real* regression baseline: `bun test`
// does NOT regenerate it. If toModuleSchema() output changes unintentionally
// this test will fail. When the change is intentional, refresh the baseline
// with `bun run snapshot:update` and commit the updated module.snap.json.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const snapshot = require("./__snapshots__/module.snap.json") as ModuleSchema;

// ─────────────────────────────────────────────────────────────────────────────
// Snapshot tests — the full ecommerce ModuleSchema is compared against the
// committed JSON snapshot. Run `bun run scripts/generate-snapshots.ts` to
// regenerate the snapshot after intentional schema changes.
// ─────────────────────────────────────────────────────────────────────────────

describe("module snapshots", () => {
  it("ecommerce module matches snapshot", () => {
    const result = toModuleSchema(
      "ecommerce",
      [CategorySchema, ProductSchema, OrderSchema, OrderItemSchema, UserSchema],
      { enums: [ProductStatusEnum, OrderStatusEnum] },
    );
    expect(result).toEqual(snapshot);
  });

  it("snapshot has correct moduleName", () => {
    expect(snapshot.moduleName).toBe("ecommerce");
  });

  it("snapshot contains all 5 tables", () => {
    const names = snapshot.tables.map((t) => t.name);
    expect(names).toEqual([
      "category",
      "product",
      "order",
      "order_item",
      "user",
    ]);
  });

  it("snapshot contains both enum types", () => {
    const enumNames = snapshot.enums?.map((e) => e.name);
    expect(enumNames).toContain("product_status");
    expect(enumNames).toContain("orders");
  });

  it("product_status enum has correct values", () => {
    const e = snapshot.enums?.find((e) => e.name === "product_status");
    expect(e.values).toEqual(["draft", "active", "archived"]);
  });

  it("orders enum has correct values", () => {
    const e = snapshot.enums?.find((e) => e.name === "orders");
    expect(e.values).toEqual([
      "pending",
      "confirmed",
      "shipped",
      "delivered",
      "cancelled",
    ]);
  });

  it("module with schema option includes schema field", () => {
    const result = toModuleSchema("billing", [CategorySchema], {
      schema: "billing",
    });
    expect(result.schema).toBe("billing");
    expect(result.moduleName).toBe("billing");
  });

  it("module without schema option omits schema field", () => {
    const result = toModuleSchema("billing", [CategorySchema]);
    expect(result.schema).toBe("public");
  });

  it("module with no enums produces empty enums array", () => {
    const result = toModuleSchema("simple", [CategorySchema]);
    expect(result.enums).toEqual([]);
  });
});
