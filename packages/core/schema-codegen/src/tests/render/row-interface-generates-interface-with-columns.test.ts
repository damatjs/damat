import { ModuleSchema } from "@damatjs/orm-type";
import { describe, it, expect } from "bun:test";
import { generateRowInterface } from "../../render/rowInterface";

{
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
}

{
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
}

{
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
}

{
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
}

{
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
}
