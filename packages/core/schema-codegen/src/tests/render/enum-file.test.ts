import { ModuleSchema } from "@damatjs/orm-type";
import { describe, it, expect } from "bun:test";
import { generateEnumsFile } from "../../render/enums";

{
  describe("generateEnumsFile", () => {
    const schema: ModuleSchema = {
      moduleName: "test",
      tables: [],
      enums: [
        { name: "status", values: ["draft", "published", "archived"] },
        { name: "role", values: ["admin", "user"] },
      ],
    };

    it("generates file content with banner", () => {
      const content = generateEnumsFile(schema, "// test banner\n");
      expect(content).toContain("// test banner");
      expect(content).toContain("export type StatusEnum");
    });
  });
}

{
  describe("generateEnumsFile", () => {
    const schema: ModuleSchema = {
      moduleName: "test",
      tables: [],
      enums: [
        { name: "status", values: ["draft", "published", "archived"] },
        { name: "role", values: ["admin", "user"] },
      ],
    };

    it("generates file content without banner", () => {
      const content = generateEnumsFile(schema, null);
      expect(content).toContain("export type StatusEnum");
      expect(content?.startsWith("export")).toBe(true);
    });
  });
}

{
  describe("generateEnumsFile", () => {
    it("returns null when no enums", () => {
      const emptySchema: ModuleSchema = { moduleName: "test", tables: [] };
      expect(generateEnumsFile(emptySchema, null)).toBe(null);
    });
  });
}
