import { describe, it, expect } from "bun:test";
import { ModuleSchema } from "@damatjs/orm-type";
import { getTableEnums } from "../render/enums";

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

  it("returns enums used by table columns", () => {
    const table: ModuleSchema["tables"][number] = {
      name: "product",
      columns: [
        { name: "status", type: "enum", enum: "status", nullable: false },
        { name: "name", type: "text", nullable: false },
      ],
    };

    const enums = getTableEnums(table, schema.enums!);
    expect(enums.length).toBe(1);
    expect(enums[0]!.name).toBe("status");
  });
});
