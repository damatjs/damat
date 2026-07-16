import { describe, it, expect } from "bun:test";
import { ModuleSchema } from "@damatjs/orm-type";
import { generateEnumTypes } from "../render/enums";

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
