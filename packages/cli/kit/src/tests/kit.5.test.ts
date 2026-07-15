import { afterEach, beforeEach, describe, expect, globToRegExp, it, resetKitTests } from "./context";

beforeEach(resetKitTests);
afterEach(resetKitTests);

describe("kit plan", () => {
  describe("globToRegExp", () => {
    it("`**` crosses path segments, including the trailing-`**` form", () => {
      const re = globToRegExp("components/**");
      expect(re.test("components/menu.tsx")).toBe(true);
      expect(re.test("components/nav/menu.tsx")).toBe(true);
      expect(re.test("component.ts")).toBe(false);
    });

    it("collapses `**/` so the segment is optional", () => {
      const re = globToRegExp("src/**/index.ts");
      expect(re.test("src/index.ts")).toBe(true);
      expect(re.test("src/a/b/index.ts")).toBe(true);
      expect(re.test("lib/index.ts")).toBe(false);
    });

    it("`*` stays within one segment", () => {
      const re = globToRegExp("src/*.ts");
      expect(re.test("src/a.ts")).toBe(true);
      expect(re.test("src/a/b.ts")).toBe(false);
      expect(globToRegExp("*.md").test("docs/a.md")).toBe(false);
    });

    it("`?` matches exactly one non-separator character", () => {
      const re = globToRegExp("a?.ts");
      expect(re.test("ab.ts")).toBe(true);
      expect(re.test("a/.ts")).toBe(false);
      expect(re.test("abc.ts")).toBe(false);
    });

    it("escapes regex metacharacters so they match literally", () => {
      const re = globToRegExp("a(1)+b.ts");
      expect(re.test("a(1)+b.ts")).toBe(true);
      expect(re.test("a1b.ts")).toBe(false);
      // "." is literal, not "any char".
      expect(globToRegExp("file.ts").test("fileXts")).toBe(false);
    });
  });

});
