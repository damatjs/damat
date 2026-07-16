import { describe, it, expect } from "bun:test";
import { toPascalCase } from "../render/naming";

describe("toPascalCase", () => {
  it("PascalCases a single lower-case word", () => {
    expect(toPascalCase("user")).toBe("User");
  });
});
