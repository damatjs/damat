import { describe, it, expect } from "bun:test";
import { enumTypeToTsBase } from "../type-mapping/ts";

describe("enumTypeToTsBase", () => {
  it("falls back to string for an empty array", () => {
    expect(enumTypeToTsBase([])).toBe("string");
  });
});
