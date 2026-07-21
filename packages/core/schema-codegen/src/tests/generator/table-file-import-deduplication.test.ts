import { DEFAULT_AUTO_FIELDS } from "../../defaults";
import { ModuleSchema } from "@damatjs/orm-type";
import { describe, it, expect } from "bun:test";
import { generateTableFile } from "../../index";

{
  describe("generateTableFile", () => {
    it("deduplicates relation imports that target the same table", () => {
      const dupSchema: ModuleSchema = {
        moduleName: "x",
        tables: [
          {
            name: "post",
            columns: [
              { name: "id", type: "uuid", nullable: false, primaryKey: true },
            ],
          },
        ],
        relationships: [
          {
            fromTable: "post",
            from: "author",
            to: "user",
            type: "belongsTo",
            linkedBy: ["author_id"],
          },
          {
            fromTable: "post",
            from: "editor",
            to: "user",
            type: "belongsTo",
            linkedBy: ["editor_id"],
          },
        ],
      };
      const content = generateTableFile(
        dupSchema.tables[0]!,
        dupSchema,
        DEFAULT_AUTO_FIELDS,
        null,
      );
      const importCount = (
        content.match(/import type \{ User \} from "\.\/user";/g) ?? []
      ).length;
      expect(importCount).toBe(1);
      // Both distinct relation fields are still emitted on the interface.
      expect(content).toContain("  author?: User;");
      expect(content).toContain("  editor?: User;");
    });
  });
}
