import { expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { generateBarrels } from "../../barrel";
import { exportLines, makeBarrelTree } from "../support/barrelFixture";

test("a second run writes byte-identical barrels in the same order", () => {
  const { root } = makeBarrelTree();
  const first = generateBarrels(root);
  const snapshot = new Map(
    first.written.map((path) => [path, readFileSync(path, "utf8")]),
  );
  const second = generateBarrels(root);
  expect(second.written).toEqual(first.written);
  for (const path of second.written) {
    expect(readFileSync(path, "utf8")).toBe(snapshot.get(path)!);
  }
});

test("an empty root gets one deterministic empty barrel", () => {
  const root = mkdtempSync(join(tmpdir(), "module-generator-root-"));
  const { written } = generateBarrels(root);
  expect(written).toEqual([join(root, "index.ts")]);
  expect(readFileSync(join(root, "index.ts"), "utf8")).toContain("export {};");
});

test("orders folders first and files second with stable sorting", () => {
  const root = mkdtempSync(join(tmpdir(), "module-generator-order-"));
  writeFileSync(join(root, "zebra.ts"), "export const zebra = 1;\n");
  mkdirSync(join(root, "beta"));
  writeFileSync(join(root, "alpha.ts"), "export const alpha = 1;\n");
  mkdirSync(join(root, "acme"));
  writeFileSync(join(root, "middle.tsx"), "export const middle = 1;\n");
  generateBarrels(root);
  const lines = exportLines(join(root, "index.ts"));
  expect(lines).toEqual([
    'export * from "./acme";',
    'export * from "./beta";',
    'export * from "./alpha";',
    'export * from "./middle";',
    'export * from "./zebra";',
  ]);
  generateBarrels(root);
  expect(exportLines(join(root, "index.ts"))).toEqual(lines);
});
