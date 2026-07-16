import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { loadModules } from "../cli/utils/load";

const roots: string[] = [];
const write = (root: string, path: string, value = "") => {
  const target = join(root, path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, value);
};
afterEach(() =>
  roots.splice(0).forEach((root) =>
    rmSync(root, {
      recursive: true,
      force: true,
    }),
  ),
);

describe("loadModules package locations", () => {
  test("returns resolved entry, models, and migrations", async () => {
    const cwd = mkdtempSync(join(tmpdir(), "damat-orm-package-"));
    roots.push(cwd);
    const root = join(cwd, "node_modules/@fixtures/billing");
    write(root, "src/index.ts", "export const models = {};\n");
    write(root, "src/models/index.ts", "export {};\n");
    write(root, "src/migrations/Migration1.sql", "-- sql\n");
    write(
      root,
      "damat.json",
      JSON.stringify({
        schemaVersion: 1,
        kind: "module",
        name: "billing",
        module: {
          models: "./src/models",
          migrations: "./src/migrations",
        },
      }),
    );
    write(
      cwd,
      "damat.config.ts",
      `export default {
      modules: { billing: {
        id: "billing",
        resolve: { type: "package", name: "@fixtures/billing" }
      } }
    };\n`,
    );
    const modules = await loadModules(join(cwd, "damat.config.ts"));
    expect(modules.billing.entry).toBe(join(root, "src/index.ts"));
    expect(modules.billing.models).toBe(join(root, "src/models"));
    expect(modules.billing.migrations).toBe(join(root, "src/migrations"));
    expect(modules.billing.mutable).toBe(false);
  });

  test("does not hide validation errors for existing source modules", async () => {
    const cwd = mkdtempSync(join(tmpdir(), "damat-orm-source-error-"));
    roots.push(cwd);
    const root = join(cwd, "modules/billing");
    write(root, "src/index.ts", "export default {};\n");
    write(
      root,
      "damat.json",
      JSON.stringify({
        schemaVersion: 1,
        kind: "module",
        name: "billing",
        module: { models: "./missing-models" },
      }),
    );
    write(
      cwd,
      "damat.config.ts",
      `export default {
        modules: { billing: { resolve: "./modules/billing" } }
      };\n`,
    );
    try {
      await loadModules(join(cwd, "damat.config.ts"));
      throw new Error("expected loadModules to reject");
    } catch (error) {
      expect((error as Error & { cause?: Error }).cause?.message).toContain(
        "models path does not exist",
      );
    }
  });
});
