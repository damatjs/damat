import { describe, it, expect } from "bun:test";
import { pgTypeToTsBase } from "../type-mapping/ts";

describe("pgTypeToTsBase › scalar mappings", () => {
  it("maps boolean to boolean", () => {
    expect(pgTypeToTsBase("boolean")).toBe("boolean");
  });
});
