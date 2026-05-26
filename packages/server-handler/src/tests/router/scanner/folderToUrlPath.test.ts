import { describe, it, expect } from "bun:test";
import { folderToUrlPath } from "../../../router/scanner/folderToUrlPath";

describe("folderToUrlPath", () => {
  describe("static paths", () => {
    it("returns unchanged path for simple paths", () => {
      expect(folderToUrlPath("users")).toBe("users");
      expect(folderToUrlPath("api/posts")).toBe("api/posts");
    });

    it("handles empty string", () => {
      expect(folderToUrlPath("")).toBe("");
    });

    it("handles paths with multiple segments", () => {
      expect(folderToUrlPath("api/v1/users")).toBe("api/v1/users");
    });
  });

  describe("dynamic params", () => {
    it("converts [param] to :param", () => {
      expect(folderToUrlPath("[userId]")).toBe(":userId");
      expect(folderToUrlPath("users/[userId]")).toBe("users/:userId");
    });

    it("converts multiple dynamic params", () => {
      expect(folderToUrlPath("users/[userId]/posts/[postId]")).toBe(
        "users/:userId/posts/:postId"
      );
    });

    it("handles mixed static and dynamic segments", () => {
      expect(folderToUrlPath("api/users/[id]")).toBe("api/users/:id");
    });
  });

  describe("catch-all routes", () => {
    it("converts [...param] to *", () => {
      expect(folderToUrlPath("[...auth]")).toBe("*");
      expect(folderToUrlPath("api/[...auth]")).toBe("api/*");
    });

    it("handles catch-all at nested paths", () => {
      expect(folderToUrlPath("api/routes/[...path]")).toBe("api/routes/*");
    });
  });

  describe("complex patterns", () => {
    it("handles combination of params and catch-all", () => {
      expect(folderToUrlPath("users/[userId]/[...actions]")).toBe(
        "users/:userId/*"
      );
    });

    it("handles multiple conversions in single path", () => {
      const result = folderToUrlPath("api/[version]/users/[userId]/[...rest]");
      expect(result).toBe("api/:version/users/:userId/*");
    });
  });
});
