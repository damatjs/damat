import { describe, it, expect } from "bun:test";
import { pgTypeToTsBase } from "../type-mapping/ts";

describe("pgTypeToTsBase › structured mappings", () => {
  it("maps range types with the right bound type", () => {
    expect(pgTypeToTsBase("int4range")).toContain("lower: number | null");
    expect(pgTypeToTsBase("int8range")).toContain("lower: bigint | null");
    expect(pgTypeToTsBase("numrange")).toContain("lower: number | null");
    expect(pgTypeToTsBase("tsrange")).toContain("lower: Date | null");
    expect(pgTypeToTsBase("daterange")).toContain("lower: Date | null");
  });
});
