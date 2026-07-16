import { describe, it, expect } from "bun:test";
import { ModuleSchema } from "@damatjs/orm-type";
import { generateRowInterface } from "../render/rowInterface";

describe("generateRowInterface", () => {
  it("handles table with no columns", () => {
    const table: ModuleSchema["tables"][number] = {
      name: "empty",
      columns: [],
    };

    const lines = generateRowInterface(table, []);
    expect(lines).toContain("export interface Empty {");
    expect(lines).toContain("}");
  });
});
