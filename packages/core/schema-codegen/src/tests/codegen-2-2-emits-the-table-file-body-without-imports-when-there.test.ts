import { describe, it, expect } from "bun:test";
import { ModuleSchema } from "@damatjs/orm-type";
import { generateTableFile } from "../index";
import { DEFAULT_AUTO_FIELDS } from "../defaults";

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
});
