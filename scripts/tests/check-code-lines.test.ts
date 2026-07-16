import { afterEach, expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { findLineViolations } from "../check-code-lines";

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

function fixture(): string {
  const root = mkdtempSync(join(tmpdir(), "damat-lines-"));
  roots.push(root);
  return root;
}

function lines(count: number): string {
  return Array.from({ length: count }, (_, index) => `line ${index}`).join(
    "\n",
  );
}

test("accepts 100 lines and rejects 101 lines", () => {
  const root = fixture();
  writeFileSync(join(root, "valid.ts"), lines(100));
  writeFileSync(join(root, "invalid.ts"), lines(101));

  const violations = findLineViolations([root]);
  expect(violations).toHaveLength(1);
  expect(violations[0]?.path).toEndWith("invalid.ts");
  expect(violations[0]?.lines).toBe(101);
});

test("does not count a trailing newline as an extra line", () => {
  const root = fixture();
  writeFileSync(join(root, "valid.ts"), `${lines(100)}\n`);
  expect(findLineViolations([root])).toEqual([]);
});

test("recurses, ignores non-code, and checks generated code", () => {
  const root = fixture();
  const nested = join(root, "nested");
  mkdirSync(nested);
  writeFileSync(join(nested, "notes.md"), lines(120));
  writeFileSync(join(nested, "agents.generated.ts"), lines(102));

  const violations = findLineViolations([root]);
  expect(violations).toHaveLength(1);
  expect(violations[0]?.path).toEndWith("agents.generated.ts");
});

test("ignores dependency and build directories", () => {
  const root = fixture();
  for (const name of ["node_modules", "dist", ".git", ".turbo"]) {
    const directory = join(root, name);
    mkdirSync(directory);
    writeFileSync(join(directory, "large.js"), lines(120));
  }
  expect(findLineViolations([root])).toEqual([]);
});
