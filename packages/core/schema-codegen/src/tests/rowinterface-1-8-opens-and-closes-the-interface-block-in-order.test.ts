import { describe, it, expect } from "bun:test";
import { ModuleSchema } from "@damatjs/orm-type";
import { generateRowInterface } from "../render/rowInterface";

describe("generateRowInterface", () => {
  it("opens and closes the interface block in order", () => {
    const table: ModuleSchema["tables"][number] = {
      name: "thing",
      columns: [{ name: "id", type: "uuid", nullable: false }],
    };
    const lines = generateRowInterface(table, []);
    expect(lines[0]).toBe("export interface Thing {");
    expect(lines[lines.length - 1]).toBe("}");
  });
});
