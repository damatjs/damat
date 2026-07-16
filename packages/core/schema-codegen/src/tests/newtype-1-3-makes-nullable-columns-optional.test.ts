import { describe, it, expect } from "bun:test";
import { ModuleSchema } from "@damatjs/orm-type";
import { generateNewType } from "../render/newType";

describe("generateNewType", () => {
  it("makes nullable columns optional", () => {
    const table: ModuleSchema["tables"][number] = {
      name: "product",
      columns: [{ name: "description", type: "text", nullable: true }],
    };

    const lines = generateNewType(table, new Set());
    expect(lines.some((l) => l.includes("description?:"))).toBe(true);
  });
});
