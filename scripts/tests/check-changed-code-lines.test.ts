import { afterEach, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { collectChangedCodePaths } from "../check-changed-code-lines";

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

function fixture(): string {
  const root = mkdtempSync(join(tmpdir(), "damat-changed-lines-"));
  roots.push(root);
  return root;
}

test("unions changed and untracked code paths", () => {
  const root = fixture();
  writeFileSync(join(root, "changed.ts"), "");
  writeFileSync(join(root, "untracked.tsx"), "");
  const runGit = (args: readonly string[]) =>
    args[0] === "diff" ? "changed.ts\0" : "untracked.tsx\0";

  expect(collectChangedCodePaths("base", root, runGit)).toEqual([
    "changed.ts",
    "untracked.tsx",
  ]);
});

test("ignores deleted and non-code paths", () => {
  const root = fixture();
  writeFileSync(join(root, "notes.md"), "");
  const runGit = (args: readonly string[]) =>
    args[0] === "diff" ? "deleted.ts\0notes.md\0" : "";

  expect(collectChangedCodePaths("base", root, runGit)).toEqual([]);
});

test("preserves paths containing spaces", () => {
  const root = fixture();
  writeFileSync(join(root, "space name.ts"), "");
  const runGit = () => "space name.ts\0";

  expect(collectChangedCodePaths("base", root, runGit)).toEqual([
    "space name.ts",
  ]);
});
