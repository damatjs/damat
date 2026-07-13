import { describe, it, expect } from "bun:test";
import { ModuleSchema } from "@damatjs/orm-type";
import { generateTypes, generateTableFile, generateFilesMap } from "../index";
import { DEFAULT_AUTO_FIELDS } from "../defaults";

describe("generateTypes", () => {
  const schema: ModuleSchema = {
    moduleName: "store",
    tables: [
      {
        name: "product",
        columns: [
          { name: "id", type: "uuid", nullable: false, primaryKey: true },
          { name: "name", type: "text", nullable: false },
          { name: "price", type: "numeric", nullable: true },
        ],
      },
      {
        name: "order",
        columns: [
          { name: "id", type: "uuid", nullable: false, primaryKey: true },
          { name: "product_id", type: "uuid", nullable: false },
          { name: "quantity", type: "integer", nullable: false, default: 1 },
        ],
      },
    ],
    enums: [{ name: "status", values: ["pending", "shipped", "delivered"] }],
    relationships: [
      {
        fromTable: "order",
        from: "product",
        to: "product",
        type: "belongsTo",
        linkedBy: ["product_id"],
      },
    ],
  };

  it("generates complete type file", () => {
    const content = generateTypes(schema);

    expect(content).toContain(
      "export type StatusEnum = 'pending' | 'shipped' | 'delivered';",
    );
    expect(content).toContain("export interface Product {");
    expect(content).toContain("export interface Order {");
    expect(content).toContain("export type NewProduct = {");
    expect(content).toContain(
      "export type UpdateProduct = Partial<Omit<Product, 'id'>>;",
    );
    expect(content).toContain("product?: Product;");
  });

  it("includes banner by default", () => {
    const content = generateTypes(schema);
    expect(content).toContain("// This file is auto-generated");
  });

  it("supports custom banner", () => {
    const content = generateTypes(schema, { banner: "// custom banner\n" });
    expect(content).toContain("// custom banner");
  });

  it("can disable banner", () => {
    const content = generateTypes(schema, { banner: false });
    expect(content.startsWith("export")).toBe(true);
  });
});

describe("generateTableFile", () => {
  const schema: ModuleSchema = {
    moduleName: "store",
    tables: [
      {
        name: "product",
        columns: [
          { name: "id", type: "uuid", nullable: false, primaryKey: true },
          { name: "name", type: "text", nullable: false },
          {
            name: "status",
            type: "enum",
            enum: "product_status",
            nullable: false,
          },
        ],
      },
      {
        name: "category",
        columns: [
          { name: "id", type: "uuid", nullable: false, primaryKey: true },
        ],
      },
    ],
    enums: [{ name: "product_status", values: ["draft", "active"] }],
    relationships: [
      {
        fromTable: "product",
        from: "category",
        to: "category",
        type: "belongsTo",
        linkedBy: ["category_id"],
      },
    ],
  };

  it("generates file with imports", () => {
    const content = generateTableFile(
      schema.tables[0]!,
      schema,
      DEFAULT_AUTO_FIELDS,
      null,
    );

    expect(content).toContain(
      'import type { ProductStatusEnum } from "./enums";',
    );
    expect(content).toContain('import type { Category } from "./category";');
    expect(content).toContain("export interface Product {");
  });

  it("emits the table file body without imports when there are none", () => {
    // The `category` table has no enum columns and no outgoing relations.
    const content = generateTableFile(
      schema.tables[1]!,
      schema,
      DEFAULT_AUTO_FIELDS,
      null,
    );
    expect(content).not.toContain("import");
    expect(content.startsWith("export interface Category {")).toBe(true);
    expect(content).toContain("export type NewCategory = {");
    expect(content).toContain(
      "export type UpdateCategory = Partial<Omit<Category, 'id'>>;",
    );
  });

  it("deduplicates relation imports that target the same table", () => {
    const dupSchema: ModuleSchema = {
      moduleName: "x",
      tables: [
        {
          name: "post",
          columns: [
            { name: "id", type: "uuid", nullable: false, primaryKey: true },
          ],
        },
      ],
      relationships: [
        {
          fromTable: "post",
          from: "author",
          to: "user",
          type: "belongsTo",
          linkedBy: ["author_id"],
        },
        {
          fromTable: "post",
          from: "editor",
          to: "user",
          type: "belongsTo",
          linkedBy: ["editor_id"],
        },
      ],
    };
    const content = generateTableFile(
      dupSchema.tables[0]!,
      dupSchema,
      DEFAULT_AUTO_FIELDS,
      null,
    );
    const importCount = (
      content.match(/import type \{ User \} from "\.\/user";/g) ?? []
    ).length;
    expect(importCount).toBe(1);
    // Both distinct relation fields are still emitted on the interface.
    expect(content).toContain("  author?: User;");
    expect(content).toContain("  editor?: User;");
  });

  it("does not emit a self-import for a self-referential table (TS2440)", () => {
    // A self-referential category tree: `category` belongsTo/hasMany itself.
    // The generated type is declared locally, so importing it from "./category"
    // would conflict with the local declaration (TS2440).
    const treeSchema: ModuleSchema = {
      moduleName: "formulary",
      tables: [
        {
          name: "category",
          columns: [
            { name: "id", type: "uuid", nullable: false, primaryKey: true },
            { name: "parent_id", type: "uuid", nullable: true },
          ],
        },
      ],
      relationships: [
        {
          fromTable: "category",
          from: "parent",
          to: "category",
          type: "belongsTo",
          linkedBy: ["parent_id"],
        },
        {
          fromTable: "category",
          from: "children",
          to: "category",
          type: "hasMany",
          linkedBy: [],
        },
      ],
    };
    const content = generateTableFile(
      treeSchema.tables[0]!,
      treeSchema,
      DEFAULT_AUTO_FIELDS,
      null,
    );
    // No self-import line.
    expect(content).not.toContain('from "./category";');
    expect(content).not.toContain("import");
    // The locally-declared type is still referenced by the relation fields.
    expect(content).toContain("export interface Category {");
    expect(content).toContain("  parent?: Category;");
    expect(content).toContain("  children?: Category[];");
  });

  it("prepends the banner when provided", () => {
    const content = generateTableFile(
      schema.tables[1]!,
      schema,
      DEFAULT_AUTO_FIELDS,
      "// gen\n",
    );
    expect(content.startsWith("// gen")).toBe(true);
  });
});

describe("generateFilesMap", () => {
  const schema: ModuleSchema = {
    moduleName: "store",
    tables: [
      {
        name: "product",
        columns: [
          { name: "id", type: "uuid", nullable: false, primaryKey: true },
        ],
      },
      {
        name: "order_item",
        columns: [
          { name: "id", type: "uuid", nullable: false, primaryKey: true },
        ],
      },
    ],
    enums: [{ name: "status", values: ["active", "inactive"] }],
    relationships: [],
  };

  it("generates all expected files", () => {
    const files = generateFilesMap(schema);

    expect(files.has("enums.ts")).toBe(true);
    expect(files.has("product.ts")).toBe(true);
    expect(files.has("order-item.ts")).toBe(true);
    expect(files.has("index.ts")).toBe(true);
  });

  it("generates correct index.ts exports", () => {
    const files = generateFilesMap(schema);
    const indexContent = files.get("index.ts")!;

    expect(indexContent).toContain('export * from "./enums";');
    expect(indexContent).toContain('export * from "./product";');
    expect(indexContent).toContain('export * from "./order-item";');
  });

  it("does not generate enums.ts when no enums", () => {
    const noEnumSchema: ModuleSchema = {
      moduleName: "test",
      tables: [
        {
          name: "item",
          columns: [
            { name: "id", type: "uuid", nullable: false, primaryKey: true },
          ],
        },
      ],
    };
    const files = generateFilesMap(noEnumSchema);

    expect(files.has("enums.ts")).toBe(false);
    const indexContent = files.get("index.ts")!;
    expect(indexContent).not.toContain('export * from "./enums";');
  });

  it("includes banner in all files", () => {
    const files = generateFilesMap(schema, { banner: "// test\n" });

    for (const [, content] of files) {
      expect(content).toContain("// test");
    }
  });

  it("emits a .zod.ts file per table alongside the type file", () => {
    const files = generateFilesMap(schema);
    expect(files.has("product.zod.ts")).toBe(true);
    expect(files.has("order-item.zod.ts")).toBe(true);

    const zod = files.get("product.zod.ts")!;
    expect(zod).toContain('import { z } from "@damatjs/deps/zod"');
    expect(zod).toContain("export const newProductSchema = z.object({");
    expect(zod).toContain("export const ProductIdSchema = z.string().uuid();");
  });

  it("exports both the type and zod modules per table from index.ts", () => {
    const files = generateFilesMap(schema);
    const index = files.get("index.ts")!;
    expect(index).toContain('export * from "./product";');
    expect(index).toContain('export * from "./product.zod";');
    expect(index).toContain('export * from "./order-item";');
    expect(index).toContain('export * from "./order-item.zod";');
  });

  it("respects banner: false across every file", () => {
    const files = generateFilesMap(schema, { banner: false });
    for (const [, content] of files) {
      expect(content).not.toContain("auto-generated");
    }
  });
});

// ─── generateTypes › column type mapping inside row interfaces ─────────────────

describe("generateTypes › row interface column mapping", () => {
  const schema: ModuleSchema = {
    moduleName: "catalog",
    tables: [
      {
        name: "product",
        columns: [
          { name: "id", type: "uuid", nullable: false, primaryKey: true },
          { name: "price", type: "numeric", nullable: false },
          { name: "in_stock", type: "boolean", nullable: false },
          {
            name: "released_at",
            type: "timestamp with time zone",
            nullable: false,
          },
          { name: "description", type: "text", nullable: true },
          { name: "tags", type: "text", nullable: true, array: true },
          { name: "specs", type: "jsonb", nullable: true },
          {
            name: "status",
            type: "enum",
            enum: "product_status",
            nullable: false,
          },
        ],
      },
    ],
    enums: [
      { name: "product_status", values: ["draft", "active", "archived"] },
    ],
    relationships: [],
  };

  it("maps each column to its expected TS type", () => {
    const out = generateTypes(schema, { banner: false });
    expect(out).toContain("  id: string;");
    expect(out).toContain("  price: number;");
    expect(out).toContain("  in_stock: boolean;");
    // released_at is a row column (only the New* type strips timestamps)
    expect(out).toContain("  released_at: Date;");
    expect(out).toContain("  description: string | null;");
    expect(out).toContain("  tags: Array<string> | null;");
    expect(out).toContain("  specs: unknown | null;");
    expect(out).toContain("  status: ProductStatusEnum;");
  });

  it("emits the enum alias type before the interfaces", () => {
    const out = generateTypes(schema, { banner: false });
    expect(out).toContain(
      "export type ProductStatusEnum = 'draft' | 'active' | 'archived';",
    );
    expect(out.indexOf("ProductStatusEnum =")).toBeLessThan(
      out.indexOf("export interface Product"),
    );
  });
});

// ─── generateTypes › New*/Update* behaviour ───────────────────────────────────

describe("generateTypes › New and Update types", () => {
  const schema: ModuleSchema = {
    moduleName: "shop",
    tables: [
      {
        name: "product",
        columns: [
          { name: "id", type: "uuid", nullable: false, primaryKey: true },
          { name: "title", type: "text", nullable: false },
          { name: "stock", type: "integer", nullable: false, default: 0 },
          { name: "description", type: "text", nullable: true },
          { name: "created_at", type: "date", nullable: false },
          { name: "updated_at", type: "date", nullable: true },
        ],
      },
    ],
    relationships: [],
  };

  it("keeps required columns required and makes default/nullable optional", () => {
    const out = generateTypes(schema, { banner: false });
    const newBlock = out.match(/export type NewProduct = \{[\s\S]*?\};/)![0];
    expect(newBlock).toContain("  title: string;");
    expect(newBlock).toContain("  stock?: number;");
    expect(newBlock).toContain("  description?: string | null;");
  });

  it("omits auto fields and the created_at/updated_at columns from New*", () => {
    const out = generateTypes(schema, { banner: false });
    const newBlock = out.match(/export type NewProduct = \{[\s\S]*?\};/)![0];
    expect(newBlock).not.toContain("id");
    expect(newBlock).not.toContain("created_at");
    expect(newBlock).not.toContain("updated_at");
  });

  it("respects a custom autoFields option", () => {
    const out = generateTypes(schema, { banner: false, autoFields: ["stock"] });
    const newBlock = out.match(/export type NewProduct = \{[\s\S]*?\};/)![0];
    expect(newBlock).not.toContain("stock");
    expect(newBlock).toContain("title: string;");
  });

  it("emits Update* as Partial<Omit<T, pk>>", () => {
    const out = generateTypes(schema, { banner: false });
    expect(out).toContain(
      "export type UpdateProduct = Partial<Omit<Product, 'id'>>;",
    );
  });

  it("falls back to Partial<T> when there is no primary key", () => {
    const noPk: ModuleSchema = {
      moduleName: "x",
      tables: [
        {
          name: "log",
          columns: [
            { name: "message", type: "text", nullable: false },
            { name: "level", type: "text", nullable: false },
          ],
        },
      ],
    };
    const out = generateTypes(noPk, { banner: false });
    expect(out).toContain("export type UpdateLog = Partial<Log>;");
  });
});

// ─── generateTypes › relations and edge cases ─────────────────────────────────

describe("generateTypes › relations and edge cases", () => {
  it("adds optional belongsTo / hasMany / hasOne relation fields", () => {
    const schema: ModuleSchema = {
      moduleName: "blog",
      tables: [
        {
          name: "user",
          columns: [
            { name: "id", type: "uuid", nullable: false, primaryKey: true },
          ],
        },
      ],
      relationships: [
        {
          fromTable: "user",
          from: "profile",
          to: "profile",
          type: "hasOne",
          linkedBy: [],
        },
        {
          fromTable: "user",
          from: "posts",
          to: "post",
          type: "hasMany",
          linkedBy: [],
        },
        {
          fromTable: "user",
          from: "org",
          to: "organization",
          type: "belongsTo",
          linkedBy: ["organization_id"],
        },
      ],
    };
    const out = generateTypes(schema, { banner: false });
    expect(out).toContain("  // loaded relations");
    expect(out).toContain("  profile?: Profile;");
    expect(out).toContain("  posts?: Post[];");
    expect(out).toContain("  organization?: Organization;");
  });

  it("emits no enum block or relation comment for a bare module", () => {
    const schema: ModuleSchema = {
      moduleName: "bare",
      tables: [
        {
          name: "category",
          columns: [
            { name: "id", type: "uuid", nullable: false, primaryKey: true },
          ],
        },
      ],
    };
    const out = generateTypes(schema, { banner: false });
    expect(out).toContain("export interface Category {");
    // New*/Update* types are always emitted, but no enum alias should be.
    expect(out).not.toMatch(/export type \w+Enum =/);
    expect(out).not.toContain("// loaded relations");
    expect(out).not.toMatch(/=\s*'/); // no enum union literal anywhere
  });

  it("PascalCases snake_case table names across all emitted artifacts", () => {
    const schema: ModuleSchema = {
      moduleName: "x",
      tables: [
        {
          name: "order_item",
          columns: [
            { name: "id", type: "uuid", nullable: false, primaryKey: true },
          ],
        },
      ],
    };
    const out = generateTypes(schema, { banner: false });
    expect(out).toContain("export interface OrderItem {");
    expect(out).toContain("export type NewOrderItem = {");
    expect(out).toContain(
      "export type UpdateOrderItem = Partial<Omit<OrderItem, 'id'>>;",
    );
  });
});
