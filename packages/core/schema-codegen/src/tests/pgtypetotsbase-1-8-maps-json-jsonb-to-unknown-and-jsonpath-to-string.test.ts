import { describe, it, expect } from "bun:test";
import { pgTypeToTsBase } from "../type-mapping/ts";

describe("pgTypeToTsBase › scalar mappings", () => {
  it("maps json/jsonb to unknown and jsonpath to string", () => {
    expect(pgTypeToTsBase("json")).toBe("unknown");
    expect(pgTypeToTsBase("jsonb")).toBe("unknown");
    expect(pgTypeToTsBase("jsonpath")).toBe("string");
  });
});
