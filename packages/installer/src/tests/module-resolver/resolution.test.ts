import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { resolveModuleArtifact } from "../../module";
import { createModule, write } from "./fixture";

const roots: string[] = [];
const temp = () => {
  const root = mkdtempSync(join(tmpdir(), "damat-resolver-"));
  roots.push(root);
  return root;
};
afterEach(() =>
  roots.splice(0).forEach((root) =>
    rmSync(root, {
      recursive: true,
      force: true,
    }),
  ),
);

describe("resolveModuleArtifact", () => {
  test("resolves a root damat.json surface", () => {
    const root = temp();
    createModule(root);
    const resolved = resolveModuleArtifact(root, root, "billing");
    expect(resolved.entry).toBe(join(root, "src/index.ts"));
    expect(resolved.models).toBe(join(root, "src/models"));
    expect(resolved.pipelines).toBe(join(root, "src/pipelines"));
  });

  test("resolves legacy src/module.json beside index.ts", () => {
    const root = temp();
    write(root, "src/index.ts", "export {};\n");
    write(root, "src/models/index.ts", "export {};\n");
    write(
      root,
      "src/module.json",
      JSON.stringify({
        name: "legacy",
        paths: { entry: "./index.ts", models: "./models" },
      }),
    );
    const resolved = resolveModuleArtifact(root, root, "legacy");
    expect(resolved.entry).toBe(join(root, "src/index.ts"));
    expect(resolved.models).toBe(join(root, "src/models"));
  });

  test("rejects a declared path outside the artifact", () => {
    const root = temp();
    write(root, "src/index.ts", "export {};\n");
    write(
      root,
      "damat.json",
      JSON.stringify({
        schemaVersion: 1,
        kind: "module",
        name: "unsafe",
        module: { entry: "./src/index.ts", models: "../models" },
      }),
    );
    expect(() => resolveModuleArtifact(root, root, "unsafe")).toThrow(
      /models.*inside the module artifact/,
    );
  });
});
