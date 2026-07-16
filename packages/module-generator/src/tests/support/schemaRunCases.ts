import { expect } from "bun:test";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { runModuleCodegen } from "../../run";
import { makeRunFixture, quietLogger, runSchema } from "./runFixture";

type Fixture = ReturnType<typeof makeRunFixture>;

export async function assertFullSchemaRun(fixture: Fixture): Promise<void> {
  const result = await runModuleCodegen(
    { schema: runSchema, moduleId: "shop", ...fixture.dirs },
    quietLogger,
  );
  expect(result.outputDir).toBe(fixture.dirs.typesDir);
  expect(result.files).toContain("registry.ts");
  expect(result.files).toContain("index.ts");
  expect(result.files).toContain("ai-sessions.ts");
  expect(existsSync(join(fixture.dirs.typesDir, "registry.ts"))).toBe(true);
  expect(existsSync(join(fixture.dirs.typesDir, "ai-sessions.ts"))).toBe(true);
  const registry = readFileSync(
    join(fixture.dirs.typesDir, "registry.ts"),
    "utf8",
  );
  expect(registry).toContain('"shop": ShopService');
  expect(registry).toContain('from "../service"');
  expect(result.scaffolded.length).toBeGreaterThan(0);
  expect(
    existsSync(
      join(
        fixture.dirs.workflowsRoot,
        "aiSessions",
        "steps",
        "createAiSessions.ts",
      ),
    ),
  ).toBe(true);
}

export async function assertScaffoldFailure(fixture: Fixture): Promise<void> {
  mkdirSync(join(fixture.root, "api"), { recursive: true });
  writeFileSync(fixture.dirs.routesRoot, "not a dir");
  const result = await runModuleCodegen(
    { schema: runSchema, moduleId: "shop", ...fixture.dirs },
    quietLogger,
  );
  expect(result.files).toContain("registry.ts");
  expect(existsSync(join(fixture.dirs.typesDir, "registry.ts"))).toBe(true);
}

export async function assertBarrelFailure(fixture: Fixture): Promise<void> {
  mkdirSync(join(fixture.dirs.workflowsRoot, "ai_planted", "index.ts"), {
    recursive: true,
  });
  const result = await runModuleCodegen(
    { schema: runSchema, moduleId: "shop", ...fixture.dirs },
    quietLogger,
  );
  expect(result.files).toContain("registry.ts");
}
