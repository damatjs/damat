import { describe, it, expect } from "bun:test";
import { ModuleSchema } from "@damatjs/orm-type";
import { generateZodFile } from "../generator/generateZodFile";

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
