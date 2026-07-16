import { describe, it, expect } from "bun:test";
import { toPascalCase } from "../render/naming";

describe("toPascalCase", () => {
  it("leaves an already-PascalCased word unchanged", () => {
    expect(toPascalCase("User")).toBe("User");
    expect(toPascalCase("OrderItem")).toBe("OrderItem");
  });
});
