import { describe, expect, test } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { loadKitProfile } from "../commands/kit/profile";

describe("loadKitProfile", () => {
  test("prefers universal damat.json", () => {
    const root = mkdtempSync(join(tmpdir(), "kit-profile-"));
    writeFileSync(
      join(root, "damat.json"),
      JSON.stringify({
        schemaVersion: 1,
        kind: "kit",
        name: "modern",
        install: {
          provides: { code: { from: "src/**", fallbackTo: "src/{id}" } },
        },
      }),
    );
    writeFileSync(
      join(root, "damat-kit.json"),
      JSON.stringify({ name: "legacy" }),
    );
    expect(loadKitProfile(root).name).toBe("modern");
  });

  test("normalizes a legacy kit in memory", () => {
    const root = mkdtempSync(join(tmpdir(), "kit-profile-"));
    writeFileSync(
      join(root, "damat-kit.json"),
      JSON.stringify({
        name: "legacy",
        version: "0.5.0",
        mappings: [{ from: "src/**", to: "features/legacy" }],
        packages: { zod: "^4" },
        ignore: ["tests/**"],
        notes: "Wire it",
      }),
    );
    const profile = loadKitProfile(root);
    expect(profile.install?.provides?.files.from).toBe("src/**");
    expect(profile.install?.provides?.files.fallbackTo).toBe("features/legacy");
    expect(profile.install?.instructions?.add).toEqual(["Wire it"]);
  });
});
