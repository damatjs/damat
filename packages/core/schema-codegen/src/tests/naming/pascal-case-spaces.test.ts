import { describe, it, expect } from "bun:test";
import { toPascalCase } from "../../render/naming";

{
  describe("toPascalCase", () => {
    it("PascalCases space-separated words", () => {
      expect(toPascalCase("order item")).toBe("OrderItem");
    });
  });
}
