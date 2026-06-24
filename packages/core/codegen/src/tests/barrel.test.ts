import { describe, it, expect } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { generateBarrels } from "../barrel";

/** Build a small workflow-like tree: <root>/widgets/{steps,workflows}/*.ts */
function makeTree() {
  const root = mkdtempSync(join(tmpdir(), "cg-barrel-"));
  const steps = join(root, "widgets", "steps");
  const workflows = join(root, "widgets", "workflows");
  mkdirSync(steps, { recursive: true });
  mkdirSync(workflows, { recursive: true });
  writeFileSync(join(steps, "createWidgets.ts"), "export const createWidgetsStep = 1;\n");
  writeFileSync(join(workflows, "createWidgets.ts"), "export const createWidgetsWorkflow = 1;\n");
  const read = (rel: string) => readFileSync(join(root, rel), "utf-8");
  return { root, read, workflows };
}

describe("generateBarrels", () => {
  it("writes an index.ts in every folder of the tree", () => {
    const { root } = makeTree();
    generateBarrels(root);
    expect(existsSync(join(root, "index.ts"))).toBe(true);
    expect(existsSync(join(root, "widgets", "index.ts"))).toBe(true);
    expect(existsSync(join(root, "widgets", "steps", "index.ts"))).toBe(true);
    expect(existsSync(join(root, "widgets", "workflows", "index.ts"))).toBe(true);
  });

  it("re-exports child folders and sibling files; excludes index.ts itself", () => {
    const { root, read } = makeTree();
    generateBarrels(root);
    const leaf = read("widgets/workflows/index.ts");
    expect(leaf).toContain('export * from "./createWidgets";');

    const table = read("widgets/index.ts");
    expect(table).toContain('export * from "./steps";');
    expect(table).toContain('export * from "./workflows";');

    const rootIndex = read("index.ts");
    expect(rootIndex).toContain('export * from "./widgets";');
    // A barrel never re-exports itself.
    expect(rootIndex).not.toContain('"./index"');
  });

  it("picks up a hand-added file on re-run (barrels overwrite)", () => {
    const { root, read, workflows } = makeTree();
    generateBarrels(root);
    writeFileSync(join(workflows, "archiveWidgets.ts"), "export const archiveWidgetsWorkflow = 1;\n");
    generateBarrels(root);
    expect(read("widgets/workflows/index.ts")).toContain('export * from "./archiveWidgets";');
  });

  it("writes an empty barrel for a folder with no exportable children", () => {
    const root = mkdtempSync(join(tmpdir(), "cg-barrel-empty-"));
    mkdirSync(join(root, "blank"));
    generateBarrels(root);
    expect(readFileSync(join(root, "blank", "index.ts"), "utf-8")).toContain("export {};");
  });

  it("no-ops on a missing directory", () => {
    const { written } = generateBarrels(join(tmpdir(), "cg-barrel-does-not-exist-xyz"));
    expect(written).toEqual([]);
  });
});
