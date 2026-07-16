import { describe, it, expect } from "bun:test";
import { toCamelCase } from "../render/naming";

describe("toCamelCase", () => {
  it("camelCases snake_case starting lower-case", () => {
    expect(toCamelCase("order_item")).toBe("orderItem");
    expect(toCamelCase("a_b_c")).toBe("aBC");
  });
});
