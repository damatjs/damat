import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mapArtifactFiles } from "../../index";

function artifact(): string {
  const root = mkdtempSync(join(tmpdir(), "installer-map-"));
  mkdirSync(join(root, "src/nested"), { recursive: true });
  writeFileSync(join(root, "src/a.ts"), "a");
  writeFileSync(join(root, "src/nested/b.ts"), "b");
  writeFileSync(join(root, "README.md"), "readme");
  return root;
}

describe("mapArtifactFiles", () => {
  test("uses first matching mapping, ignores rules, and has no unmatched fallback", () => {
    const files = mapArtifactFiles(artifact(), {
      schemaVersion: 1,
      id: "blade",
      kind: "module",
      mappings: [
        { from: "src/a.ts", to: "src/special.ts" },
        { from: "src/**", to: "src/modules/blade" },
      ],
      ignore: ["src/nested/**"],
    });
    expect(
      files.map(({ relativeSource, target }) => [relativeSource, target]),
    ).toEqual([["src/a.ts", "src/special.ts"]]);
  });

  test("maps a single-file artifact and rejects symlinks", () => {
    const root = mkdtempSync(join(tmpdir(), "installer-single-"));
    const file = join(root, "blade.ts");
    writeFileSync(file, "blade");
    expect(
      mapArtifactFiles(file, {
        schemaVersion: 1,
        id: "blade",
        kind: "module",
      })[0]?.target,
    ).toBe("blade.ts");
    symlinkSync(file, join(root, "link.ts"));
    expect(() =>
      mapArtifactFiles(root, { schemaVersion: 1, id: "blade", kind: "module" }),
    ).toThrow("symbolic link");
  });
});
