import { ModuleSchema } from "@damatjs/orm-type";
import { describe, it, expect } from "bun:test";
import { generateZodFile } from "../../generator/generateZodFile";

{
  describe("generateZodFile › banner", () => {
    const schema: ModuleSchema = {
      moduleName: "store",
      tables: [
        {
          name: "tag",
          columns: [
            { name: "id", type: "uuid", nullable: false, primaryKey: true },
            { name: "label", type: "text", nullable: false },
          ],
        },
      ],
      enums: [],
    };

    it("prepends the banner when provided", () => {
      const content = generateZodFile(schema.tables[0]!, schema, "// banner\n");
      expect(content.startsWith("// banner")).toBe(true);
      expect(content).toContain('import { z } from "@damatjs/deps/zod"');
    });
  });
}

{
  describe("generateZodFile › banner", () => {
    const schema: ModuleSchema = {
      moduleName: "store",
      tables: [
        {
          name: "tag",
          columns: [
            { name: "id", type: "uuid", nullable: false, primaryKey: true },
            { name: "label", type: "text", nullable: false },
          ],
        },
      ],
      enums: [],
    };

    it("starts with the import when banner is null", () => {
      const content = generateZodFile(schema.tables[0]!, schema, null);
      expect(content.startsWith("import { z }")).toBe(true);
    });
  });
}
