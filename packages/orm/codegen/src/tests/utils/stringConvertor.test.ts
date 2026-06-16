import { describe, it, expect } from "bun:test";
import {
  toPascalCase,
  toCamelCase,
  toEnumTypeName,
} from "../../utils/stringConvertor";

describe("toPascalCase", () => {
  it("PascalCases a single lower-case word", () => {
    expect(toPascalCase("user")).toBe("User");
  });

  it("PascalCases snake_case", () => {
    expect(toPascalCase("order_item")).toBe("OrderItem");
    expect(toPascalCase("a_b_c")).toBe("ABC");
  });

  it("PascalCases kebab-case", () => {
    expect(toPascalCase("order-item")).toBe("OrderItem");
  });

  it("PascalCases space-separated words", () => {
    expect(toPascalCase("order item")).toBe("OrderItem");
  });

  it("collapses repeated separators", () => {
    expect(toPascalCase("order__item")).toBe("OrderItem");
    expect(toPascalCase("a_-_b")).toBe("AB");
  });

  it("leaves an already-PascalCased word unchanged", () => {
    expect(toPascalCase("User")).toBe("User");
    expect(toPascalCase("OrderItem")).toBe("OrderItem");
  });

  it("does not singularise or pluralise (preserves trailing s)", () => {
    expect(toPascalCase("users")).toBe("Users");
    expect(toPascalCase("classes")).toBe("Classes");
  });
});

describe("toCamelCase", () => {
  it("camelCases snake_case starting lower-case", () => {
    expect(toCamelCase("order_item")).toBe("orderItem");
    expect(toCamelCase("a_b_c")).toBe("aBC");
  });

  it("leaves a single lower-case word unchanged", () => {
    expect(toCamelCase("user")).toBe("user");
  });

  it("does NOT lowercase an already-capitalised first letter", () => {
    // This is the source quirk that makes `toCamelCase(toPascalCase(name))`
    // a no-op for the leading character of single-word table names.
    expect(toCamelCase("User")).toBe("User");
    expect(toCamelCase("OrderItem")).toBe("OrderItem");
  });
});

describe("toEnumTypeName", () => {
  it("PascalCases and appends the Enum suffix", () => {
    expect(toEnumTypeName("product_status")).toBe("ProductStatusEnum");
    expect(toEnumTypeName("orders")).toBe("OrdersEnum");
    expect(toEnumTypeName("role")).toBe("RoleEnum");
  });

  it("keeps an already-PascalCased name and appends Enum", () => {
    expect(toEnumTypeName("ProductStatus")).toBe("ProductStatusEnum");
  });
});
