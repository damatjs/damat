import { describe, it, expect } from "bun:test";
import { ModuleSchema } from "@damatjs/orm-type";
import { generateEnumsFile } from "../render/enums";

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
