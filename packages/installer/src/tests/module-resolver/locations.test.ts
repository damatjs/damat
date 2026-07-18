import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { resolveModuleArtifact } from "../../module";
import { createModule } from "./fixture";

const roots: string[] = [];
function temp(): string {
  const root = mkdtempSync(join(tmpdir(), "damat-locations-"));
  roots.push(root);
  return root;
}
afterEach(() =>
  roots.splice(0).forEach((root) =>
    rmSync(root, {
      recursive: true,
      force: true,
    }),
  ),
);

describe("module artifact locations", () => {
  test("Node and Damat package roots expose the same surface", () => {
    const cwd = temp();
    const nodeRoot = join(cwd, "node_modules/@fixtures/billing");
    const damatRoot = join(cwd, ".damat/packages/billing");
    createModule(nodeRoot);
    createModule(damatRoot);
    const node = resolveModuleArtifact(
      { type: "package", name: "@fixtures/billing" },
      cwd,
      "billing",
    );
    const damat = resolveModuleArtifact(
      { type: "damat", path: "billing" },
      cwd,
      "billing",
    );
    expect(node.entry.slice(node.root.length)).toBe(
      damat.entry.slice(damat.root.length),
    );
    expect(node.migrations?.slice(node.root.length)).toBe(
      damat.migrations?.slice(damat.root.length),
    );
  });

  test("source modules without a manifest keep conventional compatibility", () => {
    const cwd = temp();
    const root = join(cwd, "src/modules/billing");
    createModule(root);
    rmSync(join(root, "damat.json"));
    const resolved = resolveModuleArtifact(
      "./src/modules/billing",
      cwd,
      "billing",
    );
    expect(resolved.manifest.name).toBe("billing");
    expect(resolved.entry).toBe(join(root, "src/index.ts"));
  });

  test("finds a Node package from a nested workspace directory", () => {
    const cwd = temp();
    const nested = join(cwd, "apps/api/src");
    const packageRoot = join(cwd, "node_modules/@fixtures/billing");
    createModule(packageRoot);
    const resolved = resolveModuleArtifact(
      { type: "package", name: "@fixtures/billing" },
      nested,
    );
    expect(resolved.root).toBe(packageRoot);
  });

  test("reports a valid Node package that is not installed", () => {
    const cwd = temp();
    expect(() =>
      resolveModuleArtifact({ type: "package", name: "missing" }, cwd),
    ).toThrow(/Node package module not found: missing/);
  });
});
