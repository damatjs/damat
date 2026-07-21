import { describe, expect, test } from "bun:test";
import { createProfileRecipe, type DamatManifest } from "../../index";

const provider: DamatManifest = {
  schemaVersion: 1,
  kind: "kit",
  name: "search",
  version: "2.0.0",
  install: {
    modes: ["source", "package"],
    default: "source",
    provides: {
      feature: { from: "src/**", fallbackTo: "features/{id}" },
      package: { from: "**", fallbackTo: "packages/{id}" },
    },
    ignore: ["**/*.test.ts"],
    packages: { hono: "^4" },
    usageHints: [{ token: "searchService", targets: ["src/**"] }],
  },
};

describe("createProfileRecipe", () => {
  test("converts a manifest into a generic deterministic recipe", () => {
    expect(createProfileRecipe({ provider })).toEqual({
      schemaVersion: 1,
      id: "search",
      kind: "kit",
      version: "2.0.0",
      install: { modes: ["source", "package"], default: "source" },
      mappings: [
        { from: "src/**", to: "features/search" },
        { from: "**", to: "packages/search" },
      ],
      ignore: ["**/*.test.ts"],
      packages: { hono: "^4" },
      usageHints: [{ token: "searchService", targets: ["src/**"] }],
    });
  });
});
