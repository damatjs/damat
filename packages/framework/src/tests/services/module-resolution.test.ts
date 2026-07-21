import { afterEach, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import {
  clearModules,
  getResolvedModules,
  initModules,
} from "../../services/moduleService";

let root = "";
const write = (path: string, value: string) => {
  const target = join(root, path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, value);
};
afterEach(() => {
  clearModules();
  rmSync(root, { recursive: true, force: true });
});

test("initModules imports a resolved Node package entry", async () => {
  root = mkdtempSync(join(tmpdir(), "damat-framework-module-"));
  write(
    "node_modules/@fixtures/billing/src/index.ts",
    `
    export default { service: {}, init() {
      globalThis.__damatResolvedModule = true;
    } };
  `,
  );
  write(
    "node_modules/@fixtures/billing/damat.json",
    JSON.stringify({
      schemaVersion: 1,
      kind: "module",
      name: "billing",
    }),
  );
  await initModules(
    [
      {
        id: "billing",
        resolve: { type: "package", name: "@fixtures/billing" },
      },
    ],
    root,
  );
  expect((globalThis as any).__damatResolvedModule).toBe(true);
  expect(getResolvedModules().get("billing")?.root).toBe(
    join(root, "node_modules/@fixtures/billing"),
  );
  delete (globalThis as any).__damatResolvedModule;
});
