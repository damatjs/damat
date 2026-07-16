import { describe, it, expect } from "bun:test";
import { enumTypeToTsBase } from "../type-mapping/ts";

describe("enumTypeToTsBase", () => {
  it("falls back to string when values are undefined", () => {
    expect(enumTypeToTsBase()).toBe("string");
  });
});
