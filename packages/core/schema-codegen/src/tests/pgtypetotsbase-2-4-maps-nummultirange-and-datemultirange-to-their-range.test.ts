import { describe, it, expect } from "bun:test";
import { pgTypeToTsBase } from "../type-mapping/ts";

describe("pgTypeToTsBase › structured mappings", () => {
  it("maps nummultirange and datemultirange to their range Array<...>", () => {
    expect(pgTypeToTsBase("nummultirange").startsWith("Array<{")).toBe(true);
    expect(pgTypeToTsBase("nummultirange")).toContain("lower: number | null");
    expect(pgTypeToTsBase("datemultirange").startsWith("Array<{")).toBe(true);
    expect(pgTypeToTsBase("datemultirange")).toContain("lower: Date | null");
  });
});
