import { describe, it, expect } from "bun:test";
import { pgTypeToTsBase } from "../../type-mapping/ts";

{
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
}

{
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
}

{
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
}

{
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
}

{
  describe("pgTypeToTsBase › scalar mappings", () => {
    it("maps timestamp/date to Date and time to string", () => {
      expect(pgTypeToTsBase("timestamp with time zone")).toBe("Date");
      expect(pgTypeToTsBase("timestamp without time zone")).toBe("Date");
      expect(pgTypeToTsBase("date")).toBe("Date");
      expect(pgTypeToTsBase("time with time zone")).toBe("string");
      expect(pgTypeToTsBase("time without time zone")).toBe("string");
    });
  });
}

{
  describe("pgTypeToTsBase › scalar mappings", () => {
    it("maps json/jsonb to unknown and jsonpath to string", () => {
      expect(pgTypeToTsBase("json")).toBe("unknown");
      expect(pgTypeToTsBase("jsonb")).toBe("unknown");
      expect(pgTypeToTsBase("jsonpath")).toBe("string");
    });
  });
}
