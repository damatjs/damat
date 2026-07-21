import { describe, it, expect } from "bun:test";
import { pgTypeToTsBase } from "../../type-mapping/ts";

{
  describe("pgTypeToTsBase › structured mappings", () => {
    it("maps geometric types to inline object literals", () => {
      expect(pgTypeToTsBase("point")).toBe("{ x: number; y: number }");
      expect(pgTypeToTsBase("lseg")).toBe(
        "{ x1: number; y1: number; x2: number; y2: number }",
      );
      expect(pgTypeToTsBase("box")).toBe(
        "{ x1: number; y1: number; x2: number; y2: number }",
      );
      expect(pgTypeToTsBase("circle")).toBe(
        "{ x: number; y: number; radius: number }",
      );
    });
  });
}

{
  describe("pgTypeToTsBase › structured mappings", () => {
    it("maps range types with the right bound type", () => {
      expect(pgTypeToTsBase("int4range")).toContain("lower: number | null");
      expect(pgTypeToTsBase("int8range")).toContain("lower: bigint | null");
      expect(pgTypeToTsBase("numrange")).toContain("lower: number | null");
      expect(pgTypeToTsBase("tsrange")).toContain("lower: Date | null");
      expect(pgTypeToTsBase("daterange")).toContain("lower: Date | null");
    });
  });
}

{
  describe("pgTypeToTsBase › structured mappings", () => {
    it("maps multirange types to Array<...> of the range object", () => {
      expect(pgTypeToTsBase("int4multirange").startsWith("Array<{")).toBe(true);
      expect(pgTypeToTsBase("int8multirange")).toContain(
        "lower: bigint | null",
      );
      expect(pgTypeToTsBase("tstzmultirange")).toContain("lower: Date | null");
    });
  });
}

{
  describe("pgTypeToTsBase › structured mappings", () => {
    it("maps nummultirange and datemultirange to their range Array<...>", () => {
      expect(pgTypeToTsBase("nummultirange").startsWith("Array<{")).toBe(true);
      expect(pgTypeToTsBase("nummultirange")).toContain("lower: number | null");
      expect(pgTypeToTsBase("datemultirange").startsWith("Array<{")).toBe(true);
      expect(pgTypeToTsBase("datemultirange")).toContain("lower: Date | null");
    });
  });
}
