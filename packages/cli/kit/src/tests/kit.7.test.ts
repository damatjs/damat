import { afterEach, beforeEach, buildKitPlan, describe, expect, fixtures, it, resetKitTests } from "./context";

beforeEach(resetKitTests);
afterEach(resetKitTests);

describe("kit plan", () => {
  describe("buildKitPlan", () => {
    it("applies first-match-wins mappings, prefix stripping, fallback, ignore and skips", () => {
      fixtures.readdir = {
        "/kit": [
          "z.txt",
          "components",
          ".git",
          "node_modules",
          "damat-kit.json",
          "README.md",
          "LICENSE",
          "evil-link",
        ],
        "/kit/components": ["nav", "menu.tsx"],
        "/kit/components/nav": ["item.tsx"],
      };
      fixtures.directory = { "/kit/components": true, "/kit/components/nav": true };
      fixtures.symlink = { "/kit/evil-link": true }; // symlinks never ship
      const plan = buildKitPlan("/kit", {
        name: "design-kit",
        mappings: [
          { from: "components/**", to: "src/ui" },
          { from: "components/**", to: "elsewhere" }, // never wins — first match already did
          { from: "*.txt", to: "notes" }, // empty static prefix → full path appended
        ],
        fallback: "shared",
        ignore: ["*.md"],
      });
      // Sorted by source; the manifest itself, .git, node_modules and ignored
      // files never appear.
      expect(plan.files).toEqual([
        { source: "LICENSE", target: "shared/LICENSE", via: "fallback" },
        {
          source: "components/menu.tsx",
          target: "src/ui/menu.tsx",
          via: "mapping",
        },
        {
          source: "components/nav/item.tsx",
          target: "src/ui/nav/item.tsx",
          via: "mapping",
        },
        { source: "z.txt", target: "notes/z.txt", via: "mapping" },
      ]);
      expect(plan.unmatched).toEqual([]);
    });

    it("reports unmatched files when the manifest has no fallback", () => {
      fixtures.readdir = { "/kit": ["a.ts", "b.md"] };
      const plan = buildKitPlan("/kit", {
        name: "kit",
        mappings: [{ from: "*.ts", to: "lib" }],
      });
      expect(plan.files).toEqual([
        { source: "a.ts", target: "lib/a.ts", via: "mapping" },
      ]);
      expect(plan.unmatched).toEqual(["b.md"]);
    });
  });
});
