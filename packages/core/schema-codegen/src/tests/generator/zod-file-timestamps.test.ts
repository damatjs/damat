import { ModuleSchema } from "@damatjs/orm-type";
import { describe, it, expect } from "bun:test";
import { generateZodFile } from "../../generator/generateZodFile";

{
  describe("generateZodFile with timestamps", () => {
    const schema: ModuleSchema = {
      moduleName: "store",
      tables: [
        {
          name: "order",
          columns: [
            { name: "id", type: "uuid", nullable: false, primaryKey: true },
            { name: "total", type: "numeric", nullable: false },
            {
              name: "created_at",
              type: "timestamp with time zone",
              nullable: false,
            },
            {
              name: "updated_at",
              type: "timestamp with time zone",
              nullable: true,
            },
            {
              name: "deleted_at",
              type: "timestamp with time zone",
              nullable: true,
            },
          ],
        },
      ],
      enums: [],
    };

    it("excludes timestamp columns from schemas", () => {
      const content = generateZodFile(schema.tables[0]!, schema, null);
      // These should NOT appear in the new schema
      const newSchemaMatch = content.match(
        /export const newOrderSchema = z\.object\(\{[\s\S]*?\}\)\.strict\(\);/,
      );
      expect(newSchemaMatch).toBeDefined();
      expect(newSchemaMatch![0]).not.toContain("created_at");
      expect(newSchemaMatch![0]).not.toContain("updated_at");
      expect(newSchemaMatch![0]).not.toContain("deleted_at");
    });
  });
}
