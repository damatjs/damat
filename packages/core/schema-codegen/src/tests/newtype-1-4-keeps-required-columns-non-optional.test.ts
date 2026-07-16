import { describe, it, expect } from "bun:test";
import { ModuleSchema } from "@damatjs/orm-type";
import { generateNewType } from "../render/newType";

describe("generateNewType", () => {
  it("keeps required columns non-optional", () => {
    const table: ModuleSchema["tables"][number] = {
      name: "product",
      columns: [{ name: "name", type: "text", nullable: false }],
    };

    const lines = generateNewType(table, new Set());
    expect(lines.some((l) => l.includes("name: string"))).toBe(true);
  });
});
