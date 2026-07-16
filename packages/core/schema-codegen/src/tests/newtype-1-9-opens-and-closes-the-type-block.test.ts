import { describe, it, expect } from "bun:test";
import { ModuleSchema } from "@damatjs/orm-type";
import { generateNewType } from "../render/newType";

describe("generateNewType", () => {
  it("opens and closes the type block", () => {
    const table: ModuleSchema["tables"][number] = {
      name: "thing",
      columns: [{ name: "x", type: "text", nullable: false }],
    };
    const lines = generateNewType(table, new Set());
    expect(lines[0]).toBe("export type NewThing = {");
    expect(lines[lines.length - 1]).toBe("};");
  });
});
