import { describe, it, expect } from "bun:test";
import { pgTypeToTsBase } from "../type-mapping/ts";

describe("pgTypeToTsBase › structured mappings", () => {
  it("maps multirange types to Array<...> of the range object", () => {
    expect(pgTypeToTsBase("int4multirange").startsWith("Array<{")).toBe(true);
    expect(pgTypeToTsBase("int8multirange")).toContain("lower: bigint | null");
    expect(pgTypeToTsBase("tstzmultirange")).toContain("lower: Date | null");
  });
});
