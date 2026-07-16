import { describe, it, expect } from "bun:test";
import { ModuleSchema } from "@damatjs/orm-type";
import { generateRowInterface } from "../render/rowInterface";

describe("generateRowInterface", () => {
  it("does not add the relation comment when there are no relations", () => {
    const table: ModuleSchema["tables"][number] = {
      name: "plain",
      columns: [{ name: "id", type: "uuid", nullable: false }],
    };
    const lines = generateRowInterface(table, []);
    expect(lines).not.toContain("  // loaded relations");
  });
});
