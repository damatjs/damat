import { describe, it, expect } from "bun:test";
import { ModuleSchema } from "@damatjs/orm-type";
import { generateRowInterface } from "../../utils/rowInterface";

describe("generateRowInterface", () => {
  it("generates interface with columns", () => {
    const table: ModuleSchema["tables"][number] = {
      name: "product",
      columns: [
        { name: "id", type: "uuid", nullable: false, primaryKey: true },
        { name: "name", type: "text", nullable: false },
        { name: "price", type: "numeric", nullable: true },
      ],
    };

    const lines = generateRowInterface(table, []);
    expect(lines).toContain("export interface Product {");
    expect(lines).toContain("  id: string;");
    expect(lines).toContain("  name: string;");
    expect(lines).toContain("  price: number | null;");
    expect(lines).toContain("}");
  });

  it("includes relation fields", () => {
    const table: ModuleSchema["tables"][number] = {
      name: "product",
      columns: [{ name: "id", type: "uuid", nullable: false }],
    };

    const relations = [
      {
        fromTable: "product",
        from: "category",
        to: "category",
        type: "belongsTo" as const,
        linkedBy: ["category_id"],
      },
    ];

    const lines = generateRowInterface(table, relations);
    expect(lines).toContain("  // loaded relations");
    expect(lines).toContain("  category?: Category;");
  });

  it("handles table with no columns", () => {
    const table: ModuleSchema["tables"][number] = {
      name: "empty",
      columns: [],
    };

    const lines = generateRowInterface(table, []);
    expect(lines).toContain("export interface Empty {");
    expect(lines).toContain("}");
  });

  it("handles snake_case table names", () => {
    const table: ModuleSchema["tables"][number] = {
      name: "order_item",
      columns: [{ name: "id", type: "uuid", nullable: false }],
    };

    const lines = generateRowInterface(table, []);
    expect(lines).toContain("export interface OrderItem {");
  });

  it("includes multiple relations", () => {
    const table: ModuleSchema["tables"][number] = {
      name: "post",
      columns: [{ name: "id", type: "uuid", nullable: false }],
    };

    const relations = [
      {
        fromTable: "post",
        from: "author",
        to: "user",
        type: "belongsTo" as const,
        linkedBy: ["user_id"],
      },
      {
        fromTable: "post",
        from: "comments",
        to: "comment",
        type: "hasMany" as const,
        linkedBy: [],
      },
    ];

    const lines = generateRowInterface(table, relations);
    expect(lines).toContain("  user?: User;");
    expect(lines).toContain("  comments?: Comment[];");
  });

  it("emits every column type (nullable, array, enum) verbatim", () => {
    const table: ModuleSchema["tables"][number] = {
      name: "widget",
      columns: [
        { name: "id", type: "uuid", nullable: false, primaryKey: true },
        { name: "title", type: "text", nullable: true },
        { name: "labels", type: "text", nullable: false, array: true },
        { name: "scores", type: "integer", nullable: true, array: true },
        { name: "kind", type: "enum", enum: "widget_kind", nullable: false },
        {
          name: "created_at",
          type: "timestamp with time zone",
          nullable: false,
        },
      ],
    };
    const lines = generateRowInterface(table, []);
    expect(lines).toContain("  id: string;");
    expect(lines).toContain("  title: string | null;");
    expect(lines).toContain("  labels: Array<string>;");
    expect(lines).toContain("  scores: Array<number> | null;");
    expect(lines).toContain("  kind: WidgetKindEnum;");
    // row interface keeps timestamp columns (unlike New*)
    expect(lines).toContain("  created_at: Date;");
  });

  it("does not add the relation comment when there are no relations", () => {
    const table: ModuleSchema["tables"][number] = {
      name: "plain",
      columns: [{ name: "id", type: "uuid", nullable: false }],
    };
    const lines = generateRowInterface(table, []);
    expect(lines).not.toContain("  // loaded relations");
  });

  it("opens and closes the interface block in order", () => {
    const table: ModuleSchema["tables"][number] = {
      name: "thing",
      columns: [{ name: "id", type: "uuid", nullable: false }],
    };
    const lines = generateRowInterface(table, []);
    expect(lines[0]).toBe("export interface Thing {");
    expect(lines[lines.length - 1]).toBe("}");
  });
});
