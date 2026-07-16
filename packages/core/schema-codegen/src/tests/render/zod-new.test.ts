import { ModuleSchema } from "@damatjs/orm-type";
import { describe, it, expect } from "bun:test";
import { generateNewZodSchema } from "../../render/zod";

{
  describe("generateNewZodSchema", () => {
    const allEnums = [{ name: "role", values: ["admin", "member"] }];

    it("requires plain columns, makes defaults optional, nullables nullable+optional", () => {
      const table: ModuleSchema["tables"][number] = {
        name: "user",
        columns: [
          { name: "id", type: "uuid", nullable: false, primaryKey: true },
          { name: "email", type: "text", nullable: false },
          { name: "role", type: "text", nullable: false, default: "member" },
          { name: "bio", type: "text", nullable: true },
        ],
      };
      const lines = generateNewZodSchema(table, new Set(["id"]), allEnums);
      expect(lines).toContain("  email: z.string(),");
      expect(lines).toContain("  role: z.string().optional(),");
      expect(lines).toContain("  bio: z.string().nullable().optional(),");
      // auto field omitted
      expect(lines.some((l) => l.trimStart().startsWith("id:"))).toBe(false);
    });
  });
}

{
  describe("generateNewZodSchema", () => {
    it("skips created_at / updated_at / deleted_at columns by name", () => {
      const table: ModuleSchema["tables"][number] = {
        name: "row",
        columns: [
          { name: "value", type: "text", nullable: false },
          { name: "created_at", type: "date", nullable: false },
          { name: "updated_at", type: "date", nullable: true },
          { name: "deleted_at", type: "date", nullable: true },
        ],
      };
      const lines = generateNewZodSchema(table, new Set(), []);
      const body = lines.join("\n");
      expect(body).toContain("value: z.string(),");
      expect(body).not.toContain("created_at");
      expect(body).not.toContain("updated_at");
      expect(body).not.toContain("deleted_at");
    });
  });
}

{
  describe("generateNewZodSchema", () => {
    const allEnums = [{ name: "role", values: ["admin", "member"] }];

    it("expands a named enum into z.enum([...]) with its literal values", () => {
      const table: ModuleSchema["tables"][number] = {
        name: "account",
        columns: [
          { name: "role", type: "enum", enum: "role", nullable: false },
        ],
      };
      const lines = generateNewZodSchema(table, new Set(), allEnums);
      expect(lines).toContain("  role: z.enum(['admin', 'member']),");
    });
  });
}

{
  describe("generateNewZodSchema", () => {
    const allEnums = [{ name: "role", values: ["admin", "member"] }];

    it("falls back to z.string() for an enum with no matching enum schema", () => {
      const table: ModuleSchema["tables"][number] = {
        name: "account",
        columns: [
          { name: "role", type: "enum", enum: "missing", nullable: false },
        ],
      };
      const lines = generateNewZodSchema(table, new Set(), allEnums);
      expect(lines).toContain("  role: z.string(),");
    });
  });
}
