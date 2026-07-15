import { afterEach, beforeEach, describe, expect, it, resetKitTests, targetPathError } from "./context";

beforeEach(resetKitTests);
afterEach(resetKitTests);

describe("kit manifest", () => {
  describe("targetPathError", () => {
    it("rejects empty, absolute, drive-letter, backslash and dot-laden paths", () => {
      expect(targetPathError("")).toBe("must be non-empty");
      expect(targetPathError("/etc/passwd")).toBe("must be relative");
      expect(targetPathError("\\\\share\\x")).toBe("must be relative");
      expect(targetPathError("C:/windows")).toBe("must be relative");
      expect(targetPathError("a/../b")).toBe("must not contain .. or .");
      expect(targetPathError("a\\..\\b")).toBe("must not contain .. or .");
      expect(targetPathError("./x")).toBe("must not contain .. or .");
      expect(targetPathError("..")).toBe("must not contain .. or .");
    });

    it("accepts a safe relative path", () => {
      expect(targetPathError("src/ui/kit")).toBeNull();
    });
  });

});
