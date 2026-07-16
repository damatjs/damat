import { describe, it, expect } from "bun:test";
import { pgTypeToTsBase } from "../type-mapping/ts";

describe("pgTypeToTsBase › scalar mappings", () => {
  it("maps a raw / unresolved enum type to string", () => {
    expect(pgTypeToTsBase("enum")).toBe("string");
  });
});
