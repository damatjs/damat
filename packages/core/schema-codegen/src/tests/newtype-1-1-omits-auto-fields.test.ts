import { describe, it, expect } from "bun:test";
import { ModuleSchema } from "@damatjs/orm-type";
import { generateNewType } from "../render/newType";
import { DEFAULT_AUTO_FIELDS } from "../defaults";

describe("generateNewType", () => {
  it("omits auto fields", () => {
    const table: ModuleSchema["tables"][number] = {
      name: "product",
      columns: [
        { name: "id", type: "uuid", nullable: false, primaryKey: true },
        { name: "name", type: "text", nullable: false },
      ],
    };

    const lines = generateNewType(table, DEFAULT_AUTO_FIELDS);
    expect(lines.some((l) => l.includes("id:"))).toBe(false);
    expect(lines.some((l) => l.includes("name:"))).toBe(true);
  });
});
