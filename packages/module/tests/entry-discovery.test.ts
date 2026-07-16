import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { resolveModuleEntry } from "../src";

const fixtures: string[] = [];

function fixture(): string {
  const root = mkdtempSync(join(tmpdir(), "damat-entry-"));
  fixtures.push(root);
  return root;
}

function write(path: string): void {
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, "export default {};\n");
}

afterEach(() => {
  for (const root of fixtures.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("resolveModuleEntry", () => {
  test("finds a sibling TypeScript entry", () => {
    const root = fixture();
    write(join(root, "index.ts"));
    expect(resolveModuleEntry(root, { name: "patient" })).toBe(
      join(root, "index.ts"),
    );
  });

  test("finds src/index.ts from a root manifest directory", () => {
    const root = fixture();
    write(join(root, "src", "index.ts"));
    expect(resolveModuleEntry(root, { name: "billing" })).toBe(
      join(root, "src", "index.ts"),
    );
  });

  test("honours an explicit compiled entry override", () => {
    const root = fixture();
    write(join(root, "dist", "index.js"));
    expect(
      resolveModuleEntry(root, {
        name: "billing",
        paths: { entry: "./dist/index.js" },
      }),
    ).toBe(join(root, "dist", "index.js"));
  });

  test("fails clearly when no entry exists", () => {
    expect(() => resolveModuleEntry(fixture(), { name: "missing" })).toThrow(
      'Entry "./index.ts" not found',
    );
  });
});
