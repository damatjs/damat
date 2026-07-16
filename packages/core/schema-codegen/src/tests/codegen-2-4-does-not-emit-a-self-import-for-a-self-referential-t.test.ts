import { describe, it, expect } from "bun:test";
import { ModuleSchema } from "@damatjs/orm-type";
import { generateTableFile } from "../index";
import { DEFAULT_AUTO_FIELDS } from "../defaults";

describe("generateTableFile", () => {
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
});
