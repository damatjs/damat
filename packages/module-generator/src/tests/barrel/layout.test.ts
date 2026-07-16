import { expect, test } from "bun:test";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { generateBarrels } from "../../barrel";
import { makeBarrelTree } from "../support/barrelFixture";

test("writes a barrel in every folder", () => {
  const { root } = makeBarrelTree();
  generateBarrels(root);
  expect(existsSync(join(root, "index.ts"))).toBe(true);
  expect(existsSync(join(root, "widgets", "index.ts"))).toBe(true);
  expect(existsSync(join(root, "widgets", "steps", "index.ts"))).toBe(true);
  expect(existsSync(join(root, "widgets", "workflows", "index.ts"))).toBe(true);
});

test("re-exports child folders and sibling files without itself", () => {
  const { root, read } = makeBarrelTree();
  generateBarrels(root);
  expect(read("widgets/workflows/index.ts")).toContain(
    'export * from "./createWidgets";',
  );
  expect(read("widgets/index.ts")).toContain('export * from "./steps";');
  expect(read("widgets/index.ts")).toContain('export * from "./workflows";');
  expect(read("index.ts")).toContain('export * from "./widgets";');
  expect(read("index.ts")).not.toContain('"./index"');
});

test("picks up a hand-added file on re-run", () => {
  const { root, read, workflows } = makeBarrelTree();
  generateBarrels(root);
  writeFileSync(
    join(workflows, "archiveWidgets.ts"),
    "export const archiveWidgetsWorkflow = 1;\n",
  );
  generateBarrels(root);
  expect(read("widgets/workflows/index.ts")).toContain(
    'export * from "./archiveWidgets";',
  );
});

test("writes empty barrels and no-ops on a missing directory", () => {
  const root = mkdtempSync(join(tmpdir(), "module-generator-empty-"));
  mkdirSync(join(root, "blank"));
  generateBarrels(root);
  expect(readFileSync(join(root, "blank", "index.ts"), "utf8")).toContain(
    "export {};",
  );
  expect(generateBarrels(join(root, "missing")).written).toEqual([]);
});

test("barrels a deeply nested tree depth-first", () => {
  const root = mkdtempSync(join(tmpdir(), "module-generator-deep-"));
  const leaf = join(root, "a", "b", "c");
  mkdirSync(leaf, { recursive: true });
  writeFileSync(join(leaf, "deep.ts"), "export const deep = 1;\n");
  const { written } = generateBarrels(root);
  expect(readFileSync(join(root, "index.ts"), "utf8")).toContain(
    'export * from "./a";',
  );
  expect(readFileSync(join(root, "a", "index.ts"), "utf8")).toContain(
    'export * from "./b";',
  );
  expect(readFileSync(join(root, "a", "b", "index.ts"), "utf8")).toContain(
    'export * from "./c";',
  );
  expect(readFileSync(join(leaf, "index.ts"), "utf8")).toContain(
    'export * from "./deep";',
  );
  expect(written).toEqual([
    join(leaf, "index.ts"),
    join(root, "a", "b", "index.ts"),
    join(root, "a", "index.ts"),
    join(root, "index.ts"),
  ]);
});
