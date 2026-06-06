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
});
