import { describe, it, expect } from "bun:test";
import { pgTypeToTsBase } from "../type-mapping/ts";

describe("pgTypeToTsBase › scalar mappings", () => {
  it("maps real/double/numeric/decimal to number", () => {
    for (const t of [
      "real",
      "double precision",
      "numeric",
      "decimal",
    ] as const) {
      expect(pgTypeToTsBase(t)).toBe("number");
    }
  });
});
