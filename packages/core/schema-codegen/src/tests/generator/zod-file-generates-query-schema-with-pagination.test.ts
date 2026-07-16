import { ModuleSchema } from "@damatjs/orm-type";
import { describe, it, expect } from "bun:test";
import { generateZodFile } from "../../generator/generateZodFile";

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

    it("generates query schema with pagination", () => {
      const content = generateZodFile(schema.tables[0]!, schema, null);
      // NOTE: the query const name is derived as `${toCamelCase(toPascalCase(
      // table.name))}QuerySchema`. `toCamelCase` only lowercases letters after
      // an underscore, so for a single-word table like "user" the already-
      // PascalCased "User" passes through unchanged → "UserQuerySchema".
      expect(content).toContain("export const UserQuerySchema = z.object({");
      expect(content).toContain(
        "limit: z.coerce.number().int().positive().optional(),",
      );
      expect(content).toContain(
        "offset: z.coerce.number().int().min(0).optional(),",
      );
      expect(content).toContain("orderBy: z.string().optional(),");
      expect(content).toContain(
        "orderDir: z.enum(['asc', 'desc']).optional(),",
      );
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

    it("generates type exports", () => {
      const content = generateZodFile(schema.tables[0]!, schema, null);
      expect(content).toContain(
        "export type NewUserInput = z.infer<typeof newUserSchema>;",
      );
      expect(content).toContain(
        "export type UpdateUserInput = z.infer<typeof updateUserSchema>;",
      );
      expect(content).toContain(
        "export type UserQuery = z.infer<typeof UserQuerySchema>;",
      );
      expect(content).toContain(
        "export type UserId = z.infer<typeof UserIdSchema>;",
      );
      expect(content).toContain(
        "export type UserParams = z.infer<typeof UserParamsSchema>;",
      );
    });
  });
}
