import { describe, it, expect } from "bun:test";
import { pgTypeToTsBase } from "../type-mapping/ts";

describe("pgTypeToTsBase › scalar mappings", () => {
  it("maps bigint / bigserial to bigint", () => {
    expect(pgTypeToTsBase("bigint")).toBe("bigint");
    expect(pgTypeToTsBase("bigserial")).toBe("bigint");
  });
});
