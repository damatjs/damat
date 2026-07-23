import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  clearRegistryCache,
  lookupEntry,
  type RegistryIndex,
} from "../registry";
import { moduleInfo } from "../tools/module-info";

let directory = "";

beforeAll(() => {
  directory = mkdtempSync(join(tmpdir(), "damat-mcp-namespaced-"));
  writeFileSync(
    join(directory, "registry.json"),
    JSON.stringify({
      modules: {
        "damatjs/invoice": { source: "npm:@damatjs/invoice", name: "invoice" },
        "damatjs/shared": { source: "npm:@damatjs/shared" },
        "acme/shared": { source: "npm:@acme/shared" },
      },
    }),
  );
  process.env.DAMAT_MODULE_REGISTRY = directory;
  clearRegistryCache();
});

afterAll(() => {
  delete process.env.DAMAT_MODULE_REGISTRY;
  clearRegistryCache();
  rmSync(directory, { recursive: true, force: true });
});

describe("bare refs in namespaced registries", () => {
  test("module_info resolves one unique namespaced match", async () => {
    const result = await moduleInfo.handler({ ref: "invoice" });
    expect(result.isError).toBeFalsy();
    expect(JSON.parse(result.text).ref).toBe("damatjs/invoice");
  });

  test("module_info reports all ambiguous canonical refs", async () => {
    const result = await moduleInfo.handler({ ref: "shared" });
    expect(result.isError).toBe(true);
    expect(result.text).toContain("acme/shared, damatjs/shared");
  });

  test("lookup also recognizes matching entry metadata", () => {
    const index: RegistryIndex = {
      modules: {
        "vendor/catalog-entry": {
          name: "vendor/receipt",
          source: "npm:@vendor/receipt",
        },
      },
    };
    expect(lookupEntry(index, { name: "receipt" })?.key).toBe(
      "vendor/catalog-entry",
    );
  });
});
