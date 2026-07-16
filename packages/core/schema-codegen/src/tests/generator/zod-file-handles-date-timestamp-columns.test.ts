import { ModuleSchema } from "@damatjs/orm-type";
import { describe, it, expect } from "bun:test";
import { generateZodFile } from "../../generator/generateZodFile";

{
  describe("generateZodFile", () => {
    it("handles date/timestamp columns", () => {
      const dateSchema: ModuleSchema = {
        moduleName: "test",
        tables: [
          {
            name: "event",
            columns: [
              { name: "id", type: "uuid", nullable: false, primaryKey: true },
              { name: "event_date", type: "date", nullable: false },
            ],
          },
        ],
        enums: [],
      };
      const content = generateZodFile(dateSchema.tables[0]!, dateSchema, null);
      expect(content).toContain("event_date: z.coerce.date()");
    });
  });
}

{
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

    it("generates new schema", () => {
      const content = generateZodFile(schema.tables[0]!, schema, null);
      expect(content).toContain("export const newUserSchema = z.object({");
      expect(content).toContain("email: z.string(),");
      expect(content).toContain("name: z.string(),");
      expect(content).toContain("age: z.number().int().nullable().optional(),");
      expect(content).toContain("verified: z.boolean().optional(),");
    });
  });
}

{
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

    it("coerces query params for numeric and boolean columns", () => {
      const content = generateZodFile(schema.tables[0]!, schema, null);
      // Inside the query schema, integers/booleans become coercing validators.
      expect(content).toContain(
        "age: z.coerce.number().int().nullable().optional(),",
      );
      expect(content).toContain("verified: z.coerce.boolean().optional(),");
    });
  });
}
