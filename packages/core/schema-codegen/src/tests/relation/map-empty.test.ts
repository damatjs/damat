import { buildRelationMap } from "@/relation/map";
import { describe, it, expect } from "bun:test";

{
  describe("buildRelationMap", () => {
    it("returns empty map for no relationships", () => {
      const map = buildRelationMap([]);
      expect(map.size).toBe(0);
    });
  });
}
