import { describe, it, expect } from "bun:test";
import { toPascalCase } from "../render/naming";

describe("toPascalCase", () => {
  it("collapses repeated separators", () => {
    expect(toPascalCase("order__item")).toBe("OrderItem");
    expect(toPascalCase("a_-_b")).toBe("AB");
  });
});
