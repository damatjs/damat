import { ModuleSchema } from "@damatjs/orm-type";
import { describe, it, expect } from "bun:test";
import { generateUpdateZodSchema } from "../../render/zod";

{
  describe("generateUpdateZodSchema", () => {
    it("omits primary keys and id and makes every other field optional", () => {
      const table: ModuleSchema["tables"][number] = {
        name: "item",
        columns: [
          { name: "id", type: "integer", nullable: false, primaryKey: true },
          { name: "label", type: "text", nullable: false },
          { name: "note", type: "text", nullable: true },
        ],
      };
      const lines = generateUpdateZodSchema(table, []);
      expect(lines).toContain("export const updateItemSchema = z.object({");
      expect(lines).toContain("  label: z.string().optional(),");
      expect(lines).toContain("  note: z.string().nullable().optional(),");
      expect(lines.some((l) => l.includes("id:"))).toBe(false);
    });
  });
}
