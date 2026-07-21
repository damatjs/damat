import { ModuleSchema } from "@damatjs/orm-type";
import { describe, it, expect } from "bun:test";
import { generateEnumTypes } from "../../render/enums";

{
  describe("generateEnumTypes", () => {
    it("generates enum type lines", () => {
      const schema: ModuleSchema = {
        moduleName: "test",
        tables: [],
        enums: [
          { name: "status", values: ["draft", "published", "archived"] },
          { name: "role", values: ["admin", "user"] },
        ],
      };

      const lines = generateEnumTypes(schema);
      expect(lines).toContain(
        "export type StatusEnum = 'draft' | 'published' | 'archived';",
      );
      expect(lines).toContain("export type RoleEnum = 'admin' | 'user';");
    });
  });
}

{
  describe("generateEnumTypes", () => {
    it("returns empty array for no enums", () => {
      const emptySchema: ModuleSchema = { moduleName: "test", tables: [] };
      expect(generateEnumTypes(emptySchema)).toEqual([]);
    });
  });
}

{
  describe("generateEnumTypes", () => {
    it("handles single value enum", () => {
      const schema: ModuleSchema = {
        moduleName: "test",
        tables: [],
        enums: [{ name: "simple", values: ["only_one"] }],
      };

      const lines = generateEnumTypes(schema);
      expect(lines).toContain("export type SimpleEnum = 'only_one';");
    });
  });
}
