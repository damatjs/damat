import { describe, it, expect } from "bun:test";
import { generateTypes } from "@/codegen/index";
import { toModuleSchema } from "@/schema/toModuleSchema";
import { model } from "@/schema/model";
import { columns } from "@/properties";
import {
  CategorySchema,
  ProductSchema,
  OrderSchema,
  OrderItemSchema,
  UserSchema,
} from "./__fixtures__/models";
import { OrderStatusEnum } from "./__fixtures__/order";
import { ProductStatusEnum } from "./__fixtures__/product";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Build the full ecommerce ModuleSchema used across many tests. */
function ecommerceSchema() {
  return toModuleSchema(
    "ecommerce",
    [CategorySchema, ProductSchema, OrderSchema, OrderItemSchema, UserSchema],
    { enums: [ProductStatusEnum, OrderStatusEnum] },
  );
}

// ─── Banner ───────────────────────────────────────────────────────────────────

describe("generateTypes › banner", () => {
  it("includes the default generated-file banner", () => {
    const out = generateTypes(ecommerceSchema());
    expect(out).toContain("// This file is auto-generated.");
    expect(out).toContain("bun run codegen");
  });

  it("uses a custom banner when provided", () => {
    const out = generateTypes(ecommerceSchema(), { banner: "// custom\n" });
    expect(out).toContain("// custom");
    expect(out).not.toContain("auto-generated");
  });

  it("omits the banner when banner: false", () => {
    const out = generateTypes(ecommerceSchema(), { banner: false });
    expect(out).not.toContain("auto-generated");
    expect(out).not.toContain("bun run codegen");
  });
});

// ─── Enum type aliases ────────────────────────────────────────────────────────

describe("generateTypes › enum types", () => {
  it("emits a type alias for each enum", () => {
    const out = generateTypes(ecommerceSchema());
    expect(out).toContain(
      "export type product_status = 'draft' | 'active' | 'archived';",
    );
    expect(out).toContain(
      "export type orders = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';",
    );
  });

  it("emits no enum block when the module has no enums", () => {
    const schema = toModuleSchema("bare", [CategorySchema]);
    const out = generateTypes(schema);
    expect(out).not.toContain("export type product_status");
  });
});

// ─── Row interfaces ───────────────────────────────────────────────────────────

describe("generateTypes › row interfaces", () => {
  it("emits an export interface for each table in PascalCase", () => {
    const out = generateTypes(ecommerceSchema());
    for (const name of ["Category", "Product", "Order", "OrderItem", "User"]) {
      expect(out).toContain(`export interface ${name} {`);
    }
  });

  it("maps column types to correct TS types", () => {
    const out = generateTypes(ecommerceSchema());
    // string (text / varchar / id)
    expect(out).toMatch(/id: string;/);
    // number (numeric)
    expect(out).toMatch(/price: number;/);
    // boolean
    expect(out).toMatch(/verified: boolean;/);
    // Date (timestamp)
    expect(out).toMatch(/createdAt: Date;/);
    // nullable
    expect(out).toMatch(/description: string \| null;/);
    // array
    expect(out).toMatch(/tags: Array<string> \| null;/);
    // unknown (json/jsonb)
    expect(out).toMatch(/specs: unknown \| null;/);
  });

  it("uses the enum type name for enum columns", () => {
    const out = generateTypes(ecommerceSchema());
    expect(out).toMatch(/status: product_status;/);
    expect(out).toMatch(/status: orders;/);
  });

  it("emits FK columns on the owning table", () => {
    const out = generateTypes(ecommerceSchema());
    expect(out).toContain("category_id: string | null;");
    expect(out).toContain("order_id: string;");
    expect(out).toContain("product_id: string;");
  });
});

// ─── Loaded-relation fields ───────────────────────────────────────────────────

describe("generateTypes › loaded-relation fields", () => {
  it("adds optional belongsTo field derived from FK column name", () => {
    const out = generateTypes(ecommerceSchema());
    // product has category_id → category?: Category
    expect(out).toContain("category?: Category;");
    // order_item has order_id → order?: Order
    expect(out).toContain("order?: Order;");
    // order_item has product_id → product?: Product
    expect(out).toContain("product?: Product;");
  });

  it("adds optional pluralised hasMany field", () => {
    const out = generateTypes(ecommerceSchema());
    // user hasMany order → orders?: Order[]
    expect(out).toContain("orders?: Order[];");
  });

  it("marks relation fields as optional with ?", () => {
    const out = generateTypes(ecommerceSchema());
    // all relation fields must be optional
    expect(out).not.toMatch(/^\s+category: Category;/m);
    expect(out).not.toMatch(/^\s+orders: Order\[\];/m);
  });

  it("adds a '// loaded relations' comment above relation fields", () => {
    const out = generateTypes(ecommerceSchema());
    expect(out).toContain("// loaded relations");
  });

  it("tables with no relations have no relation comment", () => {
    const schema = toModuleSchema("bare", [CategorySchema]);
    const out = generateTypes(schema);
    expect(out).not.toContain("// loaded relations");
  });
});

// ─── New* insert types ────────────────────────────────────────────────────────

describe("generateTypes › New* insert types", () => {
  it("emits a New* type for each table", () => {
    const out = generateTypes(ecommerceSchema());
    for (const name of [
      "NewCategory",
      "NewProduct",
      "NewOrder",
      "NewOrderItem",
      "NewUser",
    ]) {
      expect(out).toContain(`export type ${name} = {`);
    }
  });

  it("omits auto fields (id, createdAt, updatedAt) from New* types", () => {
    const out = generateTypes(ecommerceSchema());
    // None of the New* blocks should contain these keys
    const newBlocks = out.match(/export type New\w+ = \{[^}]+\}/gs) ?? [];
    for (const block of newBlocks) {
      expect(block).not.toMatch(/^\s+id[?:]? /m);
      expect(block).not.toMatch(/^\s+createdAt[?:]? /m);
      expect(block).not.toMatch(/^\s+updatedAt[?:]? /m);
    }
  });

  it("makes nullable columns optional in New* types", () => {
    const out = generateTypes(ecommerceSchema());
    // description is nullable text → description?: string | null
    expect(out).toContain("description?: string | null;");
    // notes is nullable → notes?: string | null
    expect(out).toContain("notes?: string | null;");
  });

  it("makes columns with a default optional in New* types", () => {
    const out = generateTypes(ecommerceSchema());
    // stock has default(0) → stock?: number
    expect(out).toContain("stock?: number;");
    // verified has default(false) → verified?: boolean
    expect(out).toContain("verified?: boolean;");
  });

  it("keeps required columns non-optional in New* types", () => {
    const out = generateTypes(ecommerceSchema());
    // title has no default and is not nullable → required
    expect(out).toContain("  title: string;");
    // quantity has no default and is not nullable → required
    expect(out).toContain("  quantity: number;");
  });

  it("respects custom autoFields option", () => {
    const schema = toModuleSchema("store", [
      model("event", {
        id: columns.id().primaryKey(),
        code: columns.text(),
        publishedAt: columns.timestamp({ withTimezone: true }),
      }),
    ]);
    const out = generateTypes(schema, { autoFields: ["publishedAt"] });
    // publishedAt should be excluded from NewEvent
    const newBlock = out.match(/export type NewEvent = \{[^}]+\}/s)?.[0] ?? "";
    expect(newBlock).not.toContain("publishedAt");
    expect(newBlock).toContain("code: string;");
  });
});

// ─── Update* partial update types ────────────────────────────────────────────

describe("generateTypes › Update* partial update types", () => {
  it("emits an Update* type for each table", () => {
    const out = generateTypes(ecommerceSchema());
    for (const name of [
      "UpdateCategory",
      "UpdateProduct",
      "UpdateOrder",
      "UpdateOrderItem",
      "UpdateUser",
    ]) {
      expect(out).toContain(`export type ${name} =`);
    }
  });

  it("wraps Update* as Partial<Omit<T, pk>>", () => {
    const out = generateTypes(ecommerceSchema());
    expect(out).toContain(
      "export type UpdateCategory = Partial<Omit<Category, 'id'>>;",
    );
    expect(out).toContain(
      "export type UpdateProduct = Partial<Omit<Product, 'id'>>;",
    );
  });

  it("falls back to Partial<T> when no PK column is found", () => {
    const schema = toModuleSchema("store", [
      model("log", {
        message: columns.text(),
        level: columns.text(),
      }),
    ]);
    const out = generateTypes(schema);
    expect(out).toContain("export type UpdateLog = Partial<Log>;");
  });
});

// ─── Edge cases ───────────────────────────────────────────────────────────────

describe("generateTypes › edge cases", () => {
  it("handles a module with no enums", () => {
    const schema = toModuleSchema("store", [CategorySchema]);
    const out = generateTypes(schema);
    expect(out).toContain("export interface Category {");
    expect(out).not.toContain("export type product_status");
  });

  it("handles a module with no relations", () => {
    const schema = toModuleSchema("store", [CategorySchema]);
    const out = generateTypes(schema);
    expect(out).not.toContain("// loaded relations");
  });

  it("snake_case table name becomes PascalCase interface", () => {
    const schema = toModuleSchema("store", [
      model("order_item", { id: columns.id().primaryKey() }),
    ]);
    const out = generateTypes(schema);
    expect(out).toContain("export interface OrderItem {");
    expect(out).toContain("export type NewOrderItem = {");
    expect(out).toContain("export type UpdateOrderItem =");
  });

  it("emits valid output for an enum column without a named enum builder", () => {
    // A raw 'enum' column type with no EnumBuilder attached falls back to 'string'
    const schema = toModuleSchema("store", [
      model("item", {
        id: columns.id().primaryKey(),
        kind: columns.text(), // plain text stands in for an unresolved enum
      }),
    ]);
    const out = generateTypes(schema);
    expect(out).toContain("kind: string;");
  });

  it("hasOne relation field is singular and non-array", () => {
    const Passport = model("passport", {
      id: columns.id().primaryKey(),
      owner_id: columns.id(),
    });
    const Person = model("person", {
      id: columns.id().primaryKey(),
      passport: columns.hasOne(Passport).mappedBy("owner"),
    });
    const schema = toModuleSchema("store", [Person, Passport]);
    const out = generateTypes(schema);
    // passport → passport?: Passport  (no array)
    expect(out).toContain("passport?: Passport;");
    expect(out).not.toContain("Passport[]");
  });
});
