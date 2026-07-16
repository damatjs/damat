import { describe, it, expect } from "bun:test";
import { pgTypeToTsBase } from "../type-mapping/ts";

describe("pgTypeToTsBase › scalar mappings", () => {
  it("maps string-ish types to string", () => {
    for (const t of [
      "uuid",
      "xml",
      "bit",
      "bit varying",
      "cidr",
      "inet",
      "macaddr",
      "macaddr8",
      "tsvector",
      "tsquery",
      "line",
      "path",
      "polygon",
      "pg_lsn",
      "pg_snapshot",
    ] as const) {
      expect(pgTypeToTsBase(t)).toBe("string");
    }
  });
});
