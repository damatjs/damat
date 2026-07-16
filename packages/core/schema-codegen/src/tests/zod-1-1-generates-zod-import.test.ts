import { describe, it, expect } from "bun:test";
import { ModuleSchema } from "@damatjs/orm-type";
import { generateZodFile } from "../generator/generateZodFile";

describe("generateZodFile", () => {
  const schema: ModuleSchema = {
    moduleName: "store",
    tables: [
      {
        name: "user",
        columns: [
          { name: "id", type: "uuid", nullable: false, primaryKey: true },
          { name: "email", type: "text", nullable: false },
          { name: "name", type: "text", nullable: false },
          { name: "age", type: "integer", nullable: true },
          {
            name: "verified",
            type: "boolean",
            nullable: false,
            default: false,
          },
        ],
      },
    ],
    enums: [],
  };

  it("generates zod import", () => {
    const content = generateZodFile(schema.tables[0]!, schema, null);
    expect(content).toContain('import { z } from "@damatjs/deps/zod"');
  });
});
