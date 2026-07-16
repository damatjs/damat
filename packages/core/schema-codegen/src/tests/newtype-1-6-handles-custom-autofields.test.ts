import { describe, it, expect } from "bun:test";
import { ModuleSchema } from "@damatjs/orm-type";
import { generateNewType } from "../render/newType";

describe("generateNewType", () => {
  it("handles custom autoFields", () => {
    const table: ModuleSchema["tables"][number] = {
      name: "audit",
      columns: [
        { name: "id", type: "uuid", nullable: false },
        { name: "version", type: "integer", nullable: false },
        { name: "data", type: "jsonb", nullable: false },
      ],
    };

    const customAutoFields = new Set(["id", "version"]);
    const lines = generateNewType(table, customAutoFields);

    expect(lines.some((l) => l.includes("id:"))).toBe(false);
    expect(lines.some((l) => l.includes("version:"))).toBe(false);
    expect(lines.some((l) => l.includes("data:"))).toBe(true);
  });
});
