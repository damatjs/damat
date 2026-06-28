import { describe, it, expect } from "bun:test";
import { ColumnType } from "@damatjs/orm-type";
import {
  pgTypeToTsBase,
  enumTypeToTsBase,
} from "../../utils/pgTypeToTsBase";

describe("pgTypeToTsBase › scalar mappings", () => {
  it("maps integer-family types to number", () => {
    for (const t of ["smallint", "integer", "smallserial", "serial", "oid"] as const) {
      expect(pgTypeToTsBase(t)).toBe("number");
    }
  });

  it("maps bigint / bigserial to bigint", () => {
    expect(pgTypeToTsBase("bigint")).toBe("bigint");
    expect(pgTypeToTsBase("bigserial")).toBe("bigint");
  });

  it("maps real/double/numeric/decimal to number", () => {
    for (const t of ["real", "double precision", "numeric", "decimal"] as const) {
      expect(pgTypeToTsBase(t)).toBe("number");
    }
  });

  it("maps character types and money to string", () => {
    for (const t of ["text", "character", "character varying", "money"] as const) {
      expect(pgTypeToTsBase(t)).toBe("string");
    }
  });

  it("maps bytea to Buffer", () => {
    expect(pgTypeToTsBase("bytea")).toBe("Buffer");
  });

  it("maps timestamp/date to Date and time to string", () => {
    expect(pgTypeToTsBase("timestamp with time zone")).toBe("Date");
    expect(pgTypeToTsBase("timestamp without time zone")).toBe("Date");
    expect(pgTypeToTsBase("date")).toBe("Date");
    expect(pgTypeToTsBase("time with time zone")).toBe("string");
    expect(pgTypeToTsBase("time without time zone")).toBe("string");
  });

  it("maps boolean to boolean", () => {
    expect(pgTypeToTsBase("boolean")).toBe("boolean");
  });

  it("maps json/jsonb to unknown and jsonpath to string", () => {
    expect(pgTypeToTsBase("json")).toBe("unknown");
    expect(pgTypeToTsBase("jsonb")).toBe("unknown");
    expect(pgTypeToTsBase("jsonpath")).toBe("string");
  });

  it("maps a raw / unresolved enum type to string", () => {
    expect(pgTypeToTsBase("enum")).toBe("string");
  });

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

  it("maps range types with the right bound type", () => {
    expect(pgTypeToTsBase("int4range")).toContain("lower: number | null");
    expect(pgTypeToTsBase("int8range")).toContain("lower: bigint | null");
    expect(pgTypeToTsBase("numrange")).toContain("lower: number | null");
    expect(pgTypeToTsBase("tsrange")).toContain("lower: Date | null");
    expect(pgTypeToTsBase("daterange")).toContain("lower: Date | null");
  });

  it("maps multirange types to Array<...> of the range object", () => {
    expect(pgTypeToTsBase("int4multirange").startsWith("Array<{")).toBe(true);
    expect(pgTypeToTsBase("int8multirange")).toContain("lower: bigint | null");
    expect(pgTypeToTsBase("tstzmultirange")).toContain("lower: Date | null");
  });

  it("maps nummultirange and datemultirange to their range Array<...>", () => {
    expect(pgTypeToTsBase("nummultirange").startsWith("Array<{")).toBe(true);
    expect(pgTypeToTsBase("nummultirange")).toContain("lower: number | null");
    expect(pgTypeToTsBase("datemultirange").startsWith("Array<{")).toBe(true);
    expect(pgTypeToTsBase("datemultirange")).toContain("lower: Date | null");
  });
});

describe("pgTypeToTsBase › unmatched", () => {
  it("returns undefined for a type not covered by the switch", () => {
    // The switch intentionally has no default branch.
    expect(pgTypeToTsBase("not_a_real_type" as ColumnType)).toBeUndefined();
  });
});

describe("enumTypeToTsBase", () => {
  it("builds a string-literal union from values", () => {
    expect(enumTypeToTsBase(["a", "b", "c"])).toBe("'a' | 'b' | 'c'");
  });

  it("handles a single value", () => {
    expect(enumTypeToTsBase(["only"])).toBe("'only'");
  });

  it("falls back to string for an empty array", () => {
    expect(enumTypeToTsBase([])).toBe("string");
  });

  it("falls back to string when values are undefined", () => {
    expect(enumTypeToTsBase()).toBe("string");
  });
});
