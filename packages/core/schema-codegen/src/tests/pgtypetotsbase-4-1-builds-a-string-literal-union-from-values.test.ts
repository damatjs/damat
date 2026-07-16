import { describe, it, expect } from "bun:test";
import { enumTypeToTsBase } from "../type-mapping/ts";

describe("enumTypeToTsBase", () => {
  it("builds a string-literal union from values", () => {
    expect(enumTypeToTsBase(["a", "b", "c"])).toBe("'a' | 'b' | 'c'");
  });
});
