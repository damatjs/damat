import { describe, it, expect } from "bun:test";
import { enumTypeToTsBase } from "../../type-mapping/ts";

{
  describe("enumTypeToTsBase", () => {
    it("builds a string-literal union from values", () => {
      expect(enumTypeToTsBase(["a", "b", "c"])).toBe("'a' | 'b' | 'c'");
    });
  });
}

{
  describe("enumTypeToTsBase", () => {
    it("handles a single value", () => {
      expect(enumTypeToTsBase(["only"])).toBe("'only'");
    });
  });
}

{
  describe("enumTypeToTsBase", () => {
    it("falls back to string for an empty array", () => {
      expect(enumTypeToTsBase([])).toBe("string");
    });
  });
}

{
  describe("enumTypeToTsBase", () => {
    it("falls back to string when values are undefined", () => {
      expect(enumTypeToTsBase()).toBe("string");
    });
  });
}
