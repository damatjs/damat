import { ModuleSchema } from "@damatjs/orm-type";
import { describe, it, expect } from "bun:test";
import { generateNewType } from "../../render/newType";

{
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
}

{
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
}

{
  describe("generateNewType", () => {
    it("generates correct type name", () => {
      const table: ModuleSchema["tables"][number] = {
        name: "order_item",
        columns: [],
      };

      const lines = generateNewType(table, new Set());
      expect(lines.some((l) => l.includes("export type NewOrderItem"))).toBe(
        true,
      );
    });
  });
}

{
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
}
