import { describe, it, expect } from "bun:test";
import { pgTypeToTsBase } from "../../type-mapping/ts";

{
  describe("pgTypeToTsBase › scalar mappings", () => {
    it("maps bigint / bigserial to bigint", () => {
      expect(pgTypeToTsBase("bigint")).toBe("bigint");
      expect(pgTypeToTsBase("bigserial")).toBe("bigint");
    });
  });
}

{
  describe("pgTypeToTsBase › scalar mappings", () => {
    it("maps bytea to Buffer", () => {
      expect(pgTypeToTsBase("bytea")).toBe("Buffer");
    });
  });
}

{
  describe("pgTypeToTsBase › scalar mappings", () => {
    it("maps boolean to boolean", () => {
      expect(pgTypeToTsBase("boolean")).toBe("boolean");
    });
  });
}

{
  describe("pgTypeToTsBase › scalar mappings", () => {
    it("maps a raw / unresolved enum type to string", () => {
      expect(pgTypeToTsBase("enum")).toBe("string");
    });
  });
}
