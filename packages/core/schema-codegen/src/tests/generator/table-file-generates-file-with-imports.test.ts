import { DEFAULT_AUTO_FIELDS } from "../../defaults";
import { ModuleSchema } from "@damatjs/orm-type";
import { describe, it, expect } from "bun:test";
import { generateTableFile } from "../../index";

{
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
}
