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
import { createMigration } from "../generator";

const ORM_MODEL = Bun.resolveSync("@damatjs/orm-model", import.meta.dir);

test("createMigration checks the same snapshot directory its builders use", async () => {
  const root = mkdtempSync(join(tmpdir(), "damat-migration-router-"));
  mkdirSync(root, { recursive: true });
  writeFileSync(
    join(root, "index.ts"),
    `import { columns, model } from ${JSON.stringify(ORM_MODEL)};
export const Item = model("items", {
  id: columns.id({ prefix: "itm" }).primaryKey(),
});`,
  );
  try {
    const first = await createMigration("inventory", root);
    expect(typeof first).toBe("string");
    const second = await createMigration("inventory", root);
    expect(typeof second).toBe("object");
    if (typeof second !== "string") expect(second.hasChanges).toBe(false);
    expect(existsSync(join(root, "inventory"))).toBe(false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
