import { describe, it, expect } from "bun:test";
import { pgTypeToTsBase } from "../type-mapping/ts";

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
