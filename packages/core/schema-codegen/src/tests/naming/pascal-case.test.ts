import { describe, it, expect } from "bun:test";
import { toPascalCase } from "../../render/naming";

{
  describe("toPascalCase", () => {
    it("PascalCases a single lower-case word", () => {
      expect(toPascalCase("user")).toBe("User");
    });
  });
}

{
  describe("toPascalCase", () => {
    it("PascalCases snake_case", () => {
      expect(toPascalCase("order_item")).toBe("OrderItem");
      expect(toPascalCase("a_b_c")).toBe("ABC");
    });
  });
}

{
  describe("toPascalCase", () => {
    it("PascalCases kebab-case", () => {
      expect(toPascalCase("order-item")).toBe("OrderItem");
    });
  });
}

{
  describe("toPascalCase", () => {
    it("collapses repeated separators", () => {
      expect(toPascalCase("order__item")).toBe("OrderItem");
      expect(toPascalCase("a_-_b")).toBe("AB");
    });
  });
}

{
  describe("toPascalCase", () => {
    it("leaves an already-PascalCased word unchanged", () => {
      expect(toPascalCase("User")).toBe("User");
      expect(toPascalCase("OrderItem")).toBe("OrderItem");
    });
  });
}

{
  describe("toPascalCase", () => {
    it("does not singularise or pluralise (preserves trailing s)", () => {
      expect(toPascalCase("users")).toBe("Users");
      expect(toPascalCase("classes")).toBe("Classes");
    });
  });
}
