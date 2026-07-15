import { afterEach, beforeEach, describe, expect, it, kitManifestErrors, resetKitTests } from "./context";

beforeEach(resetKitTests);
afterEach(resetKitTests);

describe("kit manifest", () => {
  describe("kitManifestErrors", () => {
    it("rejects non-object candidates outright", () => {
      expect(kitManifestErrors(null)).toEqual([
        "manifest must be a JSON object",
      ]);
      expect(kitManifestErrors([1, 2])).toEqual([
        "manifest must be a JSON object",
      ]);
      expect(kitManifestErrors("kit")).toEqual([
        "manifest must be a JSON object",
      ]);
    });

    it("requires a kebab-case name and a mappings array", () => {
      const errors = kitManifestErrors({
        name: "Design Kit",
        mappings: "nope",
      });
      expect(errors.some((e) => e.includes("kebab-case"))).toBe(true);
      expect(
        errors.some((e) => e.includes("`mappings` must be an array")),
      ).toBe(true);
    });

    it("validates every mapping entry's from/to", () => {
      const errors = kitManifestErrors({
        name: "kit",
        mappings: [
          { from: "", to: "/abs" }, // empty glob + absolute target
          null, // not even an object
          { from: "src/**", to: "src/kit" }, // fine
        ],
      });
      expect(errors).toContain("mappings[0].from must be a non-empty glob");
      expect(errors.some((e) => e.startsWith("mappings[0].to"))).toBe(true);
      expect(errors).toContain("mappings[1].from must be a non-empty glob");
      expect(errors.some((e) => e.startsWith("mappings[1].to"))).toBe(true);
      expect(errors.some((e) => e.startsWith("mappings[2]"))).toBe(false);
    });

    it("validates fallback, ignore and packages shapes", () => {
      const errors = kitManifestErrors({
        name: "kit",
        mappings: [],
        fallback: "../up",
        ignore: "*.md",
        packages: null,
      });
      expect(errors).toContain(
        "`fallback` must be a relative path inside the project",
      );
      expect(errors).toContain("`ignore` must be an array of globs");
      expect(errors).toContain("`packages` must be an object of name → range");
      // Non-string fallback is also rejected.
      expect(
        kitManifestErrors({ name: "kit", mappings: [], fallback: 5 }),
      ).toContain("`fallback` must be a relative path inside the project");
    });

    it("returns no errors for a fully-specified valid manifest", () => {
      expect(
        kitManifestErrors({
          name: "auth-kit",
          description: "Auth",
          version: "1.0.0",
          mappings: [{ from: "src/**", to: "src/auth" }],
          fallback: "shared/auth",
          ignore: ["**/*.test.*"],
          packages: { zod: "^3.0.0" },
          notes: "hi",
        }),
      ).toEqual([]);
    });
  });

});
