import { expect, test } from "bun:test";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createModuleMigration } from "../src";

const ORM_MODEL = Bun.resolveSync("@damatjs/orm-model", import.meta.dir);

test("generated module layout writes migrations to its declared path", async () => {
  const root = mkdtempSync(join(tmpdir(), "damat-module-scaffold-"));
  const models = join(root, "src/models");
  mkdirSync(models, { recursive: true });
  writeFileSync(
    join(root, "damat.json"),
    JSON.stringify({
      schemaVersion: 1,
      kind: "module",
      name: "inventory",
      version: "1.0.0",
      module: {
        models: "./src/models",
        migrations: "./src/migrations",
      },
    }),
  );
  writeFileSync(
    join(models, "item.ts"),
    `import { columns, model } from ${JSON.stringify(ORM_MODEL)};
export const Item = model("items", {
  id: columns.id({ prefix: "itm" }).primaryKey(),
  name: columns.text(),
});`,
  );
  try {
    const first = await createModuleMigration(root);
    expect(first.hasChanges).toBe(true);
    expect(first.filePath?.startsWith(join(root, "src/migrations"))).toBe(true);
    expect(existsSync(first.filePath!)).toBe(true);
    expect((await createModuleMigration(root)).hasChanges).toBe(false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
