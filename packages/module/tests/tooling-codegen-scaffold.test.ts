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
import { generateModuleTypes } from "../src";

const ORM_MODEL = Bun.resolveSync("@damatjs/orm-model", import.meta.dir);
const logger = { info() {}, warn() {}, error() {}, debug() {} } as any;

test("generated module layout codegens into declared src paths", async () => {
  const root = mkdtempSync(join(tmpdir(), "damat-codegen-scaffold-"));
  const src = join(root, "src");
  const models = join(src, "models");
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
        routes: "./src/api/routes",
        workflows: "./src/workflows",
        types: "./src/types",
      },
    }),
  );
  writeFileSync(join(src, "index.ts"), "export default {};");
  writeFileSync(join(src, "service.ts"), "export class InventoryService {}");
  writeFileSync(
    join(models, "item.ts"),
    `import { columns, model } from ${JSON.stringify(ORM_MODEL)};
export const Item = model("items", {
  id: columns.id({ prefix: "itm" }).primaryKey(),
  name: columns.text(),
});`,
  );
  try {
    const result = await generateModuleTypes(root, logger);
    expect(result.outputDir).toBe(join(src, "types"));
    expect(existsSync(join(src, "types/items.ts"))).toBe(true);
    expect(existsSync(join(src, "api/routes/items/route.ts"))).toBe(true);
    expect(existsSync(join(src, "workflows/items"))).toBe(true);
    expect(existsSync(join(root, "api"))).toBe(false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
