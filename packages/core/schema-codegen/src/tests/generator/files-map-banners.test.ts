import { ModuleSchema } from "@damatjs/orm-type";
import { describe, it, expect } from "bun:test";
import { generateFilesMap } from "../../index";

{
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

    it("includes banner in all files", () => {
      const files = generateFilesMap(schema, { banner: "// test\n" });

      for (const [, content] of files) {
        expect(content).toContain("// test");
      }
    });
  });
}

{
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

    it("respects banner: false across every file", () => {
      const files = generateFilesMap(schema, { banner: false });
      for (const [, content] of files) {
        expect(content).not.toContain("auto-generated");
      }
    });
  });
}
