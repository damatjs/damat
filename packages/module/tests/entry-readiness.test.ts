import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  buildModuleAppConfig,
  locateModuleDir,
  validateModuleDir,
} from "../src";

const fixtures: string[] = [];

function fixture(): string {
  const root = mkdtempSync(join(tmpdir(), "damat-entry-ready-"));
  fixtures.push(root);
  return root;
}

function write(path: string, content = "export default {};\n"): void {
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, content);
}

afterEach(() => {
  for (const root of fixtures.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("module entry integration", () => {
  test("validates root damat.json with conventional src/index.ts", () => {
    const root = fixture();
    write(
      join(root, "damat.json"),
      JSON.stringify({ schemaVersion: 1, kind: "module", name: "billing" }),
    );
    write(join(root, "src", "index.ts"));
    expect(validateModuleDir(root).errors).toEqual([]);
  });

  test("preserves src/module.json with a sibling entry", () => {
    const root = fixture();
    write(
      join(root, "src", "module.json"),
      JSON.stringify({
        name: "patient",
        paths: { entry: "./index.ts" },
      }),
    );
    write(join(root, "src", "index.ts"));
    expect(validateModuleDir(locateModuleDir(root)).errors).toEqual([]);
  });

  test("registers the resolved entry supplied by runtime", () => {
    const entry = "/module/src/index.ts";
    const config = buildModuleAppConfig({
      moduleDir: "/module",
      manifest: { name: "billing" },
      moduleConfig: {},
      entry,
    });
    expect(config.modules.billing.resolve).toBe(entry);
  });
});
