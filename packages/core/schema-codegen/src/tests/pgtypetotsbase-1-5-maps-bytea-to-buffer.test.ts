import { describe, it, expect } from "bun:test";
import { pgTypeToTsBase } from "../type-mapping/ts";

describe("pgTypeToTsBase › scalar mappings", () => {
  it("maps bytea to Buffer", () => {
    expect(pgTypeToTsBase("bytea")).toBe("Buffer");
  });
});
