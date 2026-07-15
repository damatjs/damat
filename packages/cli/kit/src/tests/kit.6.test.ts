import { afterEach, beforeEach, describe, expect, it, resetKitTests, staticPrefix } from "./context";

beforeEach(resetKitTests);
afterEach(resetKitTests);

describe("kit plan", () => {
  describe("staticPrefix", () => {
    it("returns the literal directory part before the first wildcard", () => {
      expect(staticPrefix("components/**")).toBe("components/");
      expect(staticPrefix("*.md")).toBe("");
      expect(staticPrefix("a/b/*.ts")).toBe("a/b/");
      expect(staticPrefix("docs/readme.md")).toBe("docs/");
      expect(staticPrefix("readme")).toBe("");
    });
  });

});
