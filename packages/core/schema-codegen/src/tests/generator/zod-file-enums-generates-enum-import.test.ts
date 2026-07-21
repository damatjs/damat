import { ModuleSchema } from "@damatjs/orm-type";
import { describe, it, expect } from "bun:test";
import { generateZodFile } from "../../generator/generateZodFile";

{
  describe("generateZodFile with enums", () => {
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
      ],
      enums: [
        { name: "product_status", values: ["draft", "active", "archived"] },
      ],
    };

    it("generates enum import", () => {
      const content = generateZodFile(schema.tables[0]!, schema, null);
      expect(content).toContain(
        'import type { ProductStatusEnum } from "./enums"',
      );
    });
  });
}

{
  describe("generateZodFile with enums", () => {
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
      ],
      enums: [
        { name: "product_status", values: ["draft", "active", "archived"] },
      ],
    };

    it("generates enum schema", () => {
      const content = generateZodFile(schema.tables[0]!, schema, null);
      expect(content).toContain("z.enum(['draft', 'active', 'archived'])");
    });
  });
}
