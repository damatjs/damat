import { describe, it, expect } from "bun:test";
import { pgTypeToTsBase } from "../type-mapping/ts";

describe("pgTypeToTsBase › scalar mappings", () => {
  it("maps timestamp/date to Date and time to string", () => {
    expect(pgTypeToTsBase("timestamp with time zone")).toBe("Date");
    expect(pgTypeToTsBase("timestamp without time zone")).toBe("Date");
    expect(pgTypeToTsBase("date")).toBe("Date");
    expect(pgTypeToTsBase("time with time zone")).toBe("string");
    expect(pgTypeToTsBase("time without time zone")).toBe("string");
  });
});
