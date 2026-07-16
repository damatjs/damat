import { expect, test } from "bun:test";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { runCodegen } from "../../run";
import { makeRunFixture, quietLogger } from "../support/runFixture";

const ormModelEntry = Bun.resolveSync("@damatjs/orm-model", import.meta.dir);

test("discovers models, builds a schema, and runs generation", async () => {
  const fixture = makeRunFixture();
  try {
    const moduleResolver = join(fixture.root, "__fixtures__", "module");
    mkdirSync(moduleResolver, { recursive: true });
    writeFileSync(
      join(moduleResolver, "index.ts"),
      `import { model, columns } from ${JSON.stringify(ormModelEntry)};
export const models = {
  Widget: model("widgets", {
    id: columns.id().primaryKey(),
    name: columns.text(),
  }),
};
`,
    );
    const result = await runCodegen(
      { moduleResolver, moduleId: "shop", ...fixture.dirs },
      quietLogger,
    );
    expect(result.outputDir).toBe(fixture.dirs.typesDir);
    expect(result.files).toContain("registry.ts");
    expect(existsSync(join(fixture.dirs.typesDir, "widgets.ts"))).toBe(true);
  } finally {
    fixture.cleanup();
  }
});
