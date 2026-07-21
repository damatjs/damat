import { describe, it, expect } from "bun:test";
import {
  corsConfigSetter,
  type CorsConfigType,
} from "../../middleware/corsConfig";

describe("corsConfigSetter", () => {
  describe("defaults", () => {
    it("returns a permissive default config when no argument is given", () => {
      const config = corsConfigSetter();
      expect(config.origin).toBe("*");
      expect(config.allowMethods).toEqual([
        "GET",
        "POST",
        "PUT",
        "PATCH",
        "DELETE",
        "OPTIONS",
      ]);
      expect(config.credentials).toBe(true);
      expect(config.maxAge).toBe(86400);
      expect(config.allowHeaders).toContain("Authorization");
      expect(config.exposeHeaders).toContain("X-Request-ID");
    });

    it("treats '*' the same as the default wildcard origin", () => {
      const config = corsConfigSetter("*");
      expect(config.origin).toBe("*");
    });
  });

  describe("string origins", () => {
    it("wraps a single origin string into a one-element array", () => {
      const config = corsConfigSetter("https://example.com");
      expect(config.origin).toEqual(["https://example.com"]);
    });

    it("splits a comma-separated origin string into an array", () => {
      const config = corsConfigSetter("https://a.com,https://b.com");
      expect(config.origin).toEqual(["https://a.com", "https://b.com"]);
    });
  });

  describe("object config passthrough", () => {
    it("returns a fully specified config object unchanged", () => {
      const custom: CorsConfigType = {
        origin: ["https://app.example.com"],
        allowMethods: ["GET", "POST"],
        allowHeaders: ["Content-Type"],
        exposeHeaders: ["X-Custom"],
        credentials: false,
        maxAge: 3600,
      };
      const config = corsConfigSetter(custom);
      expect(config).toBe(custom);
    });
  });
});
