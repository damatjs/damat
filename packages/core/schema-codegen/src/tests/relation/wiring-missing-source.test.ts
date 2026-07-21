import { ModuleSchema } from "@damatjs/orm-type";
import { describe, it, expect } from "bun:test";
import { generateTypes } from "../../index";

{
  describe("generateTypes relation wiring", () => {
    const table = (name: string): ModuleSchema["tables"][number] => ({
      name,
      columns: [
        { name: "id", type: "uuid", nullable: false, primaryKey: true },
      ],
    });

    it("silently drops relations whose source table is not in the model set", () => {
      const schema: ModuleSchema = {
        moduleName: "blog",
        tables: [table("posts")],
        relationships: [
          {
            fromTable: "ghosts",
            from: "post",
            to: "posts",
            type: "belongsTo",
            linkedBy: ["post_id"],
          },
        ],
      };

      const content = generateTypes(schema, { banner: false });

      // Only tables in the set are iterated, so the orphan relation vanishes.
      expect(content).toContain("export interface Posts {");
      expect(content).not.toContain("loaded relations");
      expect(content).not.toContain("post?:");
    });
  });
}
