import { describe, it, expect } from "bun:test";
import { ModuleSchema } from "@damatjs/orm-type";
import { generateRowInterface } from "../render/rowInterface";

describe("generateRowInterface", () => {
  it("handles snake_case table names", () => {
    const table: ModuleSchema["tables"][number] = {
      name: "order_item",
      columns: [{ name: "id", type: "uuid", nullable: false }],
    };

    const lines = generateRowInterface(table, []);
    expect(lines).toContain("export interface OrderItem {");
  });
});
