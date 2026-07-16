import { describe, it, expect } from "bun:test";
import { toPascalCase } from "../render/naming";

describe("toPascalCase", () => {
  it("PascalCases snake_case", () => {
    expect(toPascalCase("order_item")).toBe("OrderItem");
    expect(toPascalCase("a_b_c")).toBe("ABC");
  });
});
