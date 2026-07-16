import { describe, it, expect } from "bun:test";
import { toCamelCase } from "../../render/naming";

{
  describe("toCamelCase", () => {
    it("camelCases snake_case starting lower-case", () => {
      expect(toCamelCase("order_item")).toBe("orderItem");
      expect(toCamelCase("a_b_c")).toBe("aBC");
    });
  });
}

{
  describe("toCamelCase", () => {
    it("leaves a single lower-case word unchanged", () => {
      expect(toCamelCase("user")).toBe("user");
    });
  });
}

{
  describe("toCamelCase", () => {
    it("does NOT lowercase an already-capitalised first letter", () => {
      // This is the source quirk that makes `toCamelCase(toPascalCase(name))`
      // a no-op for the leading character of single-word table names.
      expect(toCamelCase("User")).toBe("User");
      expect(toCamelCase("OrderItem")).toBe("OrderItem");
    });
  });
}
