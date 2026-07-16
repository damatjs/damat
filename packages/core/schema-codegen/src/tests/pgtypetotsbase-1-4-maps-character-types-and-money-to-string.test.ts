import { describe, it, expect } from "bun:test";
import { pgTypeToTsBase } from "../type-mapping/ts";

describe("pgTypeToTsBase › scalar mappings", () => {
  it("maps character types and money to string", () => {
    for (const t of [
      "text",
      "character",
      "character varying",
      "money",
    ] as const) {
      expect(pgTypeToTsBase(t)).toBe("string");
    }
  });
});
