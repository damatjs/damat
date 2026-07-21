import { afterEach, beforeEach, expect, test } from "bun:test";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { runModuleCodegen } from "../../run";
import { makeRunFixture, quietLogger, runSchema } from "../support/runFixture";
import {
  assertBarrelFailure,
  assertFullSchemaRun,
  assertScaffoldFailure,
} from "../support/schemaRunCases";

let fixture: ReturnType<typeof makeRunFixture>;
beforeEach(() => {
  fixture = makeRunFixture();
});
afterEach(() => fixture.cleanup());

test("writes schema files, registry, scaffold, and result", async () => {
  await assertFullSchemaRun(fixture);
});

test("uses aliases for the registry service import", async () => {
  await runModuleCodegen(
    {
      schema: runSchema,
      moduleId: "shop",
      ...fixture.dirs,
      aliases: { module: "@shop", workflows: "@workflows" },
    },
    quietLogger,
  );
  const registry = readFileSync(
    join(fixture.dirs.typesDir, "registry.ts"),
    "utf8",
  );
  expect(registry).toContain('from "@shop/service"');
});

test("augments the files map before writing", async () => {
  let seen = false;
  await runModuleCodegen(
    {
      schema: runSchema,
      moduleId: "shop",
      ...fixture.dirs,
      augmentFilesMap: (files) => {
        seen = true;
        files.set("extra.ts", "// extra\n");
      },
    },
    quietLogger,
  );
  expect(seen).toBe(true);
  expect(existsSync(join(fixture.dirs.typesDir, "extra.ts"))).toBe(true);
});

test("resolves an existing service class", async () => {
  mkdirSync(fixture.dirs.serviceDir, { recursive: true });
  writeFileSync(
    join(fixture.dirs.serviceDir, "service.ts"),
    `export class WidgetService extends ModuleService("shop") {}`,
  );
  await runModuleCodegen(
    { schema: runSchema, moduleId: "shop", ...fixture.dirs },
    quietLogger,
  );
  const registry = readFileSync(
    join(fixture.dirs.typesDir, "registry.ts"),
    "utf8",
  );
  expect(registry).toContain('"shop": WidgetService');
});

test("uses the global logger when none is injected", async () => {
  const result = await runModuleCodegen({
    schema: runSchema,
    moduleId: "shop",
    ...fixture.dirs,
  });
  expect(result.files).toContain("registry.ts");
});

test("keeps schema output when CRUD scaffolding fails", async () => {
  await assertScaffoldFailure(fixture);
});

test("keeps schema output when barrel generation fails", async () => {
  await assertBarrelFailure(fixture);
});
