import { ModuleSchema } from "@damatjs/orm-type";
import { describe, it, expect } from "bun:test";
import { getTableEnums } from "../../render/enums";

{
  describe("getTableEnums", () => {
    const schema: ModuleSchema = {
      moduleName: "test",
      tables: [],
      enums: [
        { name: "status", values: ["draft", "published"] },
        { name: "role", values: ["admin", "user"] },
        { name: "priority", values: ["low", "medium", "high"] },
      ],
    };

    it("returns empty array when no enum columns", () => {
      const table: ModuleSchema["tables"][number] = {
        name: "simple",
        columns: [
          { name: "id", type: "uuid", nullable: false },
          { name: "name", type: "text", nullable: false },
        ],
      };

      expect(getTableEnums(table, schema.enums!)).toEqual([]);
    });
  });
}
