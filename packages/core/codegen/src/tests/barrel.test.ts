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

  it("is idempotent: a second run rewrites byte-identical barrels", () => {
    const { root } = makeTree();
    const first = generateBarrels(root);
    const snapshot = new Map(
      first.written.map((p) => [p, readFileSync(p, "utf-8")]),
    );

    const second = generateBarrels(root);

    // Same barrels, same order, same bytes.
    expect(second.written).toEqual(first.written);
    for (const path of second.written) {
      expect(readFileSync(path, "utf-8")).toBe(snapshot.get(path)!);
    }
  });

  it("writes a single empty barrel for an empty root directory", () => {
    const root = mkdtempSync(join(tmpdir(), "cg-barrel-empty-root-"));
    const { written } = generateBarrels(root);
    expect(written).toEqual([join(root, "index.ts")]);
    expect(readFileSync(join(root, "index.ts"), "utf-8")).toContain("export {};");
  });

  it("barrels a deeply nested tree so the root re-exports transitively", () => {
    const root = mkdtempSync(join(tmpdir(), "cg-barrel-deep-"));
    const leaf = join(root, "a", "b", "c");
    mkdirSync(leaf, { recursive: true });
    writeFileSync(join(leaf, "deep.ts"), "export const deep = 1;\n");

    const { written } = generateBarrels(root);

    // Every level gets a barrel, each re-exporting the next level down.
    expect(readFileSync(join(root, "index.ts"), "utf-8")).toContain('export * from "./a";');
    expect(readFileSync(join(root, "a", "index.ts"), "utf-8")).toContain('export * from "./b";');
    expect(readFileSync(join(root, "a", "b", "index.ts"), "utf-8")).toContain('export * from "./c";');
    expect(readFileSync(join(leaf, "index.ts"), "utf-8")).toContain('export * from "./deep";');

    // Depth-first walk: a child's barrel is written before its parent's.
    expect(written).toEqual([
      join(leaf, "index.ts"),
      join(root, "a", "b", "index.ts"),
      join(root, "a", "index.ts"),
      join(root, "index.ts"),
    ]);
  });

  it("orders exports stably: sorted folders first, then sorted files", () => {
    const root = mkdtempSync(join(tmpdir(), "cg-barrel-order-"));
    // Create children in deliberately non-alphabetical order.
    writeFileSync(join(root, "zebra.ts"), "export const zebra = 1;\n");
    mkdirSync(join(root, "beta"));
    writeFileSync(join(root, "alpha.ts"), "export const alpha = 1;\n");
    mkdirSync(join(root, "acme"));
    writeFileSync(join(root, "middle.tsx"), "export const middle = 1;\n");

    generateBarrels(root);

    const lines = readFileSync(join(root, "index.ts"), "utf-8")
      .split("\n")
      .filter((l) => l.startsWith("export * from"));

    // Directories (sorted) precede files (sorted); .tsx loses its extension too.
    expect(lines).toEqual([
      'export * from "./acme";',
      'export * from "./beta";',
      'export * from "./alpha";',
      'export * from "./middle";',
      'export * from "./zebra";',
    ]);

    // Ordering is stable across runs.
    generateBarrels(root);
    const again = readFileSync(join(root, "index.ts"), "utf-8")
      .split("\n")
      .filter((l) => l.startsWith("export * from"));
    expect(again).toEqual(lines);
  });
});
