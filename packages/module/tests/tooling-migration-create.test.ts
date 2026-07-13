import { describe, expect, test } from "bun:test";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  rmSync,
  existsSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createModuleMigration } from "../src";

/**
 * createModuleMigration diffs the module's models against the last on-disk
 * snapshot and writes a .sql migration. It is pure filesystem + schema diffing
 * (no database), so it runs fully here against a throwaway module package with a
 * real (tiny) model. The model is imported by its resolved absolute path
 * because the tmp dir lives outside the package's node_modules.
 */
const ORM_MODEL = Bun.resolveSync("@damatjs/orm-model", import.meta.dir);
const MODEL_INDEX = `
import { model, columns } from ${JSON.stringify(ORM_MODEL)};

export const Widget = model("widget", {
  id: columns.id({ prefix: "wgt" }).primaryKey(),
  label: columns.varchar().length(64),
});

export const models = { Widget };
`;

function makeModulePackage(): { pkg: string; src: string } {
  const pkg = mkdtempSync(join(tmpdir(), "damat-create-mig-"));
  const src = join(pkg, "src");
  mkdirSync(src);
  writeFileSync(
    join(src, "module.json"),
    JSON.stringify({ name: "widget", version: "1.0.0" }),
  );
  writeFileSync(join(src, "index.ts"), MODEL_INDEX);
  return { pkg, src };
}

describe("createModuleMigration", () => {
  test("generates a migration file when models differ from the snapshot", async () => {
    const { pkg } = makeModulePackage();
    try {
      const result = await createModuleMigration(pkg);
      expect(result.hasChanges).toBe(true);
      expect(result.filePath).toBeDefined();
      expect(existsSync(result.filePath!)).toBe(true);
    } finally {
      rmSync(pkg, { recursive: true, force: true });
    }
  });

  test("reports no changes on a second run (snapshot now matches)", async () => {
    const { pkg } = makeModulePackage();
    try {
      const first = await createModuleMigration(pkg);
      expect(first.hasChanges).toBe(true);
      const second = await createModuleMigration(pkg);
      expect(second.hasChanges).toBe(false);
      expect(second.filePath).toBeUndefined();
    } finally {
      rmSync(pkg, { recursive: true, force: true });
    }
  });
});
