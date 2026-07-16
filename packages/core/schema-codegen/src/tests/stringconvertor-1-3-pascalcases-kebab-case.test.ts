import { describe, it, expect } from "bun:test";
import { toPascalCase } from "../render/naming";

describe("toPascalCase", () => {
  it("PascalCases kebab-case", () => {
    expect(toPascalCase("order-item")).toBe("OrderItem");
  });
});
