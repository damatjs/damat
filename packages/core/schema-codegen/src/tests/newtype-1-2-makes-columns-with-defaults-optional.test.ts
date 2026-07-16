import { describe, it, expect } from "bun:test";
import { ModuleSchema } from "@damatjs/orm-type";
import { generateNewType } from "../render/newType";

describe("generateNewType", () => {
  it("makes columns with defaults optional", () => {
    const table: ModuleSchema["tables"][number] = {
      name: "product",
      columns: [
        { name: "status", type: "text", nullable: false, default: "draft" },
      ],
    };

    const lines = generateNewType(table, new Set());
    expect(lines.some((l) => l.includes("status?:"))).toBe(true);
  });
});
