import { describe, it, expect } from "bun:test";
import { toCamelCase } from "../render/naming";

describe("toCamelCase", () => {
  it("leaves a single lower-case word unchanged", () => {
    expect(toCamelCase("user")).toBe("user");
  });
});
