import { expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeGeneratedOutput } from "../run/writeOutput";

test("writes a package registry from a module type import", () => {
  const root = mkdtempSync(join(tmpdir(), "cg-output-"));
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
