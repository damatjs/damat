import { describe, expect, test } from "bun:test";
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { hashTree } from "../../index";

function project(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), "installer-tree-"));
  for (const [path, body] of Object.entries(files)) {
    mkdirSync(join(root, path, ".."), { recursive: true });
    writeFileSync(join(root, path), body);
  }
  return root;
}

describe("hashTree", () => {
  test("is stable for empty trees and creation order", () => {
    expect(hashTree(project({}))).toBe(hashTree(project({})));
    expect(hashTree(project({ "b.ts": "b", "a.ts": "a" }))).toBe(
      hashTree(project({ "a.ts": "a", "b.ts": "b" })),
    );
  });

  test("changes with path, content, and executable mode", () => {
    const root = project({ "a.ts": "a" });
    const original = hashTree(root);
    writeFileSync(join(root, "a.ts"), "b");
    expect(hashTree(root)).not.toBe(original);
    writeFileSync(join(root, "a.ts"), "a");
    renameSync(join(root, "a.ts"), join(root, "b.ts"));
    expect(hashTree(root)).not.toBe(original);
    renameSync(join(root, "b.ts"), join(root, "a.ts"));
    chmodSync(join(root, "a.ts"), 0o755);
    expect(hashTree(root)).not.toBe(original);
  });

  test("ignores VCS and dependency directories", () => {
    const root = project({
      "index.ts": "x",
      ".git/config": "first",
      "node_modules/a/index.js": "first",
    });
    const original = hashTree(root);
    writeFileSync(join(root, ".git/config"), "second");
    writeFileSync(join(root, "node_modules/a/index.js"), "second");
    expect(hashTree(root)).toBe(original);
  });
});
