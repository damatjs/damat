import { ModuleSchema } from "@damatjs/orm-type";
import { describe, it, expect } from "bun:test";
import { generateZodFile } from "../../generator/generateZodFile";

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

  it("generates id schema", () => {
    const content = generateZodFile(schema.tables[0]!, schema, null);
    // Same camelCase quirk as the query schema → "UserIdSchema".
    expect(content).toContain("export const UserIdSchema = z.string().uuid();");
  });

  it("generates params schema for the [id] route, keyed by id with the pk type", () => {
    const content = generateZodFile(schema.tables[0]!, schema, null);
    expect(content).toContain("export const UserParamsSchema = z.object({");
    expect(content).toContain("  id: z.string().uuid(),");
    expect(content).toContain("}).strict();");
  });
});
