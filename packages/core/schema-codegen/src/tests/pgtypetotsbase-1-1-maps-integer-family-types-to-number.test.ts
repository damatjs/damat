import { describe, it, expect } from "bun:test";
import { pgTypeToTsBase } from "../type-mapping/ts";

describe("pgTypeToTsBase › scalar mappings", () => {
  it("maps integer-family types to number", () => {
    for (const t of [
      "smallint",
      "integer",
      "smallserial",
      "serial",
      "oid",
    ] as const) {
      expect(pgTypeToTsBase(t)).toBe("number");
    }
  });
});
