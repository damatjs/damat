import { afterEach, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { resolveModuleArtifact } from "../../module";
import { write } from "./fixture";

const roots: string[] = [];
afterEach(() =>
  roots
    .splice(0)
    .forEach((root) => rmSync(root, { recursive: true, force: true })),
);

test("declared paths cannot escape through symlinks", () => {
  const workspace = mkdtempSync(join(tmpdir(), "damat-resolver-security-"));
  roots.push(workspace);
  const root = join(workspace, "module");
  const outside = join(workspace, "outside");
  write(root, "src/index.ts", "export {};\n");
  write(outside, "index.ts", "export {};\n");
  symlinkSync(outside, join(root, "models"));
  write(
    root,
    "damat.json",
    JSON.stringify({
      schemaVersion: 1,
      kind: "module",
      name: "unsafe",
      module: { models: "./models" },
    }),
  );
  expect(() => resolveModuleArtifact(root, workspace, "unsafe")).toThrow(
    /models.*inside the module artifact/,
  );
});

test("Node package names cannot traverse outside node_modules", () => {
  const workspace = mkdtempSync(join(tmpdir(), "damat-package-security-"));
  roots.push(workspace);
  const artifact = join(workspace, "artifact");
  write(artifact, "src/index.ts", "export default {};\n");
  write(
    artifact,
    "damat.json",
    JSON.stringify({ schemaVersion: 1, kind: "module", name: "unsafe" }),
  );
  expect(() =>
    resolveModuleArtifact(
      { type: "package", name: "../../artifact" },
      workspace,
      "unsafe",
    ),
  ).toThrow(/invalid Node package name/);
});

test("Damat package symlinks cannot escape the package store", () => {
  const workspace = mkdtempSync(join(tmpdir(), "damat-store-security-"));
  roots.push(workspace);
  const artifact = join(workspace, "artifact");
  const store = join(workspace, ".damat/packages");
  write(artifact, "src/index.ts", "export default {};\n");
  write(
    artifact,
    "damat.json",
    JSON.stringify({ schemaVersion: 1, kind: "module", name: "unsafe" }),
  );
  mkdirSync(store, { recursive: true });
  symlinkSync(artifact, join(store, "unsafe"), "dir");
  expect(() =>
    resolveModuleArtifact(
      { type: "damat", path: "unsafe" },
      workspace,
      "unsafe",
    ),
  ).toThrow(/inside \.damat\/packages/);
});
