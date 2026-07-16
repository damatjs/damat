import { describe, it, expect } from "bun:test";
import { toCamelCase } from "../render/naming";

describe("toCamelCase", () => {
  it("does NOT lowercase an already-capitalised first letter", () => {
    // This is the source quirk that makes `toCamelCase(toPascalCase(name))`
    // a no-op for the leading character of single-word table names.
    expect(toCamelCase("User")).toBe("User");
    expect(toCamelCase("OrderItem")).toBe("OrderItem");
  });
});
