import { afterEach, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { loadModules } from "../cli/utils/load";

let root = "";

afterEach(() => rmSync(root, { recursive: true, force: true }));

test("loadModules resolves an internal Damat package location", async () => {
  root = mkdtempSync(join(tmpdir(), "damat-orm-internal-"));
  const artifact = join(root, ".damat/packages/billing");
  mkdirSync(join(artifact, "src/models"), { recursive: true });
  writeFileSync(join(artifact, "src/index.ts"), "export default {};\n");
  writeFileSync(join(artifact, "src/models/index.ts"), "export {};\n");
  writeFileSync(
    join(artifact, "damat.json"),
    JSON.stringify({
      schemaVersion: 1,
      kind: "module",
      name: "billing",
      module: { models: "./src/models" },
    }),
  );
  const config = join(root, "damat.config.ts");
  writeFileSync(
    config,
    `export default { modules: { billing: {
      resolve: { type: "damat", path: "billing" }
    } } };`,
  );

  const modules = await loadModules(config);
  expect(modules.billing.path).toBe("billing");
  expect(modules.billing.resolve).toBe(artifact);
  expect(modules.billing.mutable).toBe(false);
});
