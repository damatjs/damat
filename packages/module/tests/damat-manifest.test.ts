import { describe, expect, test } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  buildModuleAppConfig,
  locateModuleDir,
  readModuleManifest,
} from "../src";

describe("universal module manifest", () => {
  test("normalizes damat.json runtime metadata to ModuleManifest", () => {
    const root = mkdtempSync(join(tmpdir(), "damat-module-"));
    writeFileSync(
      join(root, "damat.json"),
      JSON.stringify({
        schemaVersion: 1,
        kind: "module",
        name: "billing",
        version: "1.0.0",
        install: { packages: { zod: "^4" } },
        module: {
          description: "Billing",
          entry: "./index.ts",
          models: "./models",
          migrations: "./migrations",
          jobs: "./jobs",
          env: [{ name: "API_KEY" }],
          modules: ["user"],
          pairsWith: ["payment"],
        },
      }),
    );
    const manifest = readModuleManifest(root);
    expect(manifest).toMatchObject({
      name: "billing",
      version: "1.0.0",
      description: "Billing",
      packages: { zod: "^4" },
      paths: { entry: "./index.ts", jobs: "./jobs" },
    });
    expect(
      buildModuleAppConfig({
        moduleDir: root,
        manifest,
        moduleConfig: {},
      }).modules.billing?.resolve,
    ).toBe(root);
    expect(locateModuleDir(root)).toBe(root);
  });

  test("prefers damat.json but reads legacy module.json", () => {
    const root = mkdtempSync(join(tmpdir(), "damat-module-"));
    writeFileSync(
      join(root, "module.json"),
      JSON.stringify({ name: "legacy" }),
    );
    expect(readModuleManifest(root).name).toBe("legacy");
    writeFileSync(
      join(root, "damat.json"),
      JSON.stringify({
        schemaVersion: 1,
        kind: "module",
        name: "modern",
      }),
    );
    expect(readModuleManifest(root).name).toBe("modern");
  });
});
