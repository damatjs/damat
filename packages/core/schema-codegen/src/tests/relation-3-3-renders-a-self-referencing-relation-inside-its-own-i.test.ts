import { describe, it, expect } from "bun:test";
import { ModuleSchema } from "@damatjs/orm-type";
import { generateTypes } from "../index";

describe("generateTypes relation wiring", () => {
  it("renders a self-referencing relation inside its own interface", () => {
    const schema: ModuleSchema = {
      moduleName: "catalog",
      tables: [
        {
          name: "categories",
          columns: [
            { name: "id", type: "uuid", nullable: false, primaryKey: true },
            { name: "parent_id", type: "uuid", nullable: true },
          ],
        },
      ],
      relationships: [
        {
          fromTable: "categories",
          from: "parent",
          to: "categories",
          type: "belongsTo",
          linkedBy: ["parent_id"],
        },
        {
          fromTable: "categories",
          from: "children",
          to: "categories",
          type: "hasMany",
          linkedBy: [],
        },
      ],
    };

    const content = generateTypes(schema, { banner: false });

    expect(content).toContain("export interface Categories {");
    expect(content).toContain("  parent?: Categories;");
    expect(content).toContain("  children?: Categories[];");
  });
});
