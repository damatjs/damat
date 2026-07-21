import { expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { registryModuleAugmentation } from "../../registry";
import { writeGeneratedOutput } from "../../run/writeOutput";

test("package registries derive the service from the resolved entry", () => {
  const output = registryModuleAugmentation(
    "blog",
    "BlogModule",
    "../../node_modules/blog/src/index",
  );
  expect(output).toContain(
    'type BlogModule = typeof import("../../node_modules/blog/src/index").default;',
  );
  expect(output).toContain('"blog": BlogModule["service"];');
});

test("generated output writes a package registry from a module type import", () => {
  const root = mkdtempSync(join(tmpdir(), "module-generator-output-"));
  const typesDir = join(root, "types");
  try {
    const files = writeGeneratedOutput({
      filesMap: new Map([["widgets.ts", "export interface Widget {}\n"]]),
      typesDir,
      moduleId: "blog",
      serviceDir: join(root, "service"),
      serviceImport: "../service",
      moduleTypeImport: "../../node_modules/blog/src/index",
    });
    expect(files).toEqual(["widgets.ts", "registry.ts"]);
    expect(readFileSync(join(typesDir, "registry.ts"), "utf8")).toContain(
      '"blog": BlogModule["service"];',
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
