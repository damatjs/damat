import { describe, it, expect } from "bun:test";
import { enumTypeToTsBase } from "../type-mapping/ts";

describe("enumTypeToTsBase", () => {
  it("handles a single value", () => {
    expect(enumTypeToTsBase(["only"])).toBe("'only'");
  });
});
