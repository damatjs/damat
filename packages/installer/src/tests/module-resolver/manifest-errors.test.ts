import { afterEach, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  ModuleManifestNotFoundError,
  resolveModuleArtifact,
} from "../../module";
import { write } from "./fixture";

let root = "";
afterEach(() => rmSync(root, { recursive: true, force: true }));

function moduleRoot(): string {
  root = mkdtempSync(join(tmpdir(), "damat-manifest-error-"));
  write(root, "src/index.ts", "export default {};\n");
  return root;
}

test("malformed damat.json does not fall back to bare source", () => {
  const path = moduleRoot();
  write(path, "damat.json", "{broken");
  expect(() => resolveModuleArtifact(path, path, "billing")).toThrow(
    /Invalid JSON/,
  );
});

test("wrong manifest kind does not fall back to bare source", () => {
  const path = moduleRoot();
  write(
    path,
    "damat.json",
    JSON.stringify({ schemaVersion: 1, kind: "kit", name: "billing" }),
  );
  expect(() => resolveModuleArtifact(path, path, "billing")).toThrow(
    /kind must be module/,
  );
});

test("missing manifests expose a typed error", () => {
  const error = new ModuleManifestNotFoundError("missing");
  expect(error).toBeInstanceOf(Error);
  expect(error.message).toBe("missing");
});
