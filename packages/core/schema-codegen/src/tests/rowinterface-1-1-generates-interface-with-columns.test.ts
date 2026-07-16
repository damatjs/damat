import { describe, it, expect } from "bun:test";
import { ModuleSchema } from "@damatjs/orm-type";
import { generateRowInterface } from "../render/rowInterface";

describe("generateRowInterface", () => {
  it("generates interface with columns", () => {
    const table: ModuleSchema["tables"][number] = {
      name: "product",
      columns: [
        { name: "id", type: "uuid", nullable: false, primaryKey: true },
        { name: "name", type: "text", nullable: false },
        { name: "price", type: "numeric", nullable: true },
      ],
    };

    const lines = generateRowInterface(table, []);
    expect(lines).toContain("export interface Product {");
    expect(lines).toContain("  id: string;");
    expect(lines).toContain("  name: string;");
    expect(lines).toContain("  price: number | null;");
    expect(lines).toContain("}");
  });
});
