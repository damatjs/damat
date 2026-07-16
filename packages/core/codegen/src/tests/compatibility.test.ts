import { expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import * as generator from "@damatjs/module-generator";
import * as schema from "@damatjs/schema-codegen";
import * as legacy from "../index";

const ownerEntries = [...Object.entries(schema), ...Object.entries(generator)];
const ownerKeys = [...new Set(ownerEntries.map(([key]) => key))].sort();
const packageRoot = join(import.meta.dir, "..", "..");

test("legacy root is the exact collision-free owner union", () => {
  const collisions = Object.keys(schema).filter((key) => key in generator);
  expect(collisions).toEqual([]);
  expect(Object.keys(legacy).sort()).toEqual(ownerKeys);
});

test("every legacy runtime export is the owner export", () => {
  for (const [name, value] of ownerEntries) {
    expect(legacy[name as keyof typeof legacy]).toBe(value);
  }
});

test("types subpath has a source-backed owner barrel", () => {
  const sourcePath = join(packageRoot, "src", "types", "index.ts");
  expect(existsSync(sourcePath)).toBeTrue();
  expect(
    readFileSync(sourcePath, "utf8").match(/^export type \* from /gm),
  ).toHaveLength(2);
});

test("facade metadata points only at replacement owners", () => {
  const pkg = JSON.parse(
    readFileSync(join(packageRoot, "package.json"), "utf8"),
  );
  expect(pkg.description).toBe(
    "Deprecated compatibility facade for Damat code generation",
  );
  expect(pkg.keywords).toEqual([
    "deprecated",
    "@damatjs/schema-codegen",
    "@damatjs/module-generator",
  ]);
  expect(pkg.dependencies).toEqual({
    "@damatjs/module-generator": "workspace:*",
    "@damatjs/schema-codegen": "workspace:*",
  });
});

test("facade source contains exports only", () => {
  const source = readFileSync(join(packageRoot, "src", "index.ts"), "utf8");
  expect(source).not.toMatch(/\b(function|class|const|let|var)\b/);
  expect(source).not.toContain("console.");
  expect(source.match(/^export \* from /gm)).toHaveLength(2);
});
