import { describe, it, expect } from "bun:test";
import { pgTypeToTsBase } from "@/utils/pgTypeToTsBase";
import type { ColumnType } from "@/types";

const ts = (t: string) => pgTypeToTsBase(t as ColumnType);

describe("pgTypeToTsBase › geometric/text-search string types", () => {
  it("line / path / polygon serialise to string", () => {
    expect(ts("line")).toBe("string");
    expect(ts("path")).toBe("string");
    expect(ts("polygon")).toBe("string");
  });

  it("tsvector / tsquery serialise to string", () => {
    expect(ts("tsvector")).toBe("string");
    expect(ts("tsquery")).toBe("string");
  });
});

describe("pgTypeToTsBase › range types", () => {
  it("numrange has number bounds", () => {
    expect(ts("numrange")).toContain("lower: number | null");
  });

  it("daterange has Date bounds", () => {
    expect(ts("daterange")).toContain("lower: Date | null");
  });
});

describe("pgTypeToTsBase › multirange types", () => {
  it("int8multirange is an array of bigint-bound ranges", () => {
    const out = ts("int8multirange");
    expect(out.startsWith("Array<{")).toBe(true);
    expect(out).toContain("lower: bigint | null");
  });

  it("nummultirange is an array of number-bound ranges", () => {
    const out = ts("nummultirange");
    expect(out.startsWith("Array<{")).toBe(true);
    expect(out).toContain("lower: number | null");
  });

  it("tsmultirange / tstzmultirange are arrays of Date-bound ranges", () => {
    expect(ts("tsmultirange").startsWith("Array<{")).toBe(true);
    expect(ts("tstzmultirange")).toContain("lower: Date | null");
  });
});
