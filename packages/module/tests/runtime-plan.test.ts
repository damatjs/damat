import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  assertModuleDatabaseConfigured,
  ModuleDatabaseRequiredError,
  resolveModuleRuntimePlan,
  standaloneMigrationCatalogs,
} from "../src";

const roots: string[] = [];
const savedDatabaseUrl = process.env.DATABASE_URL;

function moduleRoot(module: Record<string, unknown>): string {
  const root = mkdtempSync(join(tmpdir(), "damat-runtime-plan-"));
  roots.push(root);
  mkdirSync(join(root, "src"));
  writeFileSync(join(root, "src", "index.ts"), "export default {};\n");
  writeFileSync(
    join(root, "damat.json"),
    JSON.stringify({ schemaVersion: 1, kind: "module", name: "demo", module }),
  );
  return root;
}

afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
  if (savedDatabaseUrl === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = savedDatabaseUrl;
});

describe("standalone module runtime plan", () => {
  test("keeps a service-only module database-free", async () => {
    process.env.DATABASE_URL = "postgres://unused";
    const plan = await resolveModuleRuntimePlan({
      packageDir: moduleRoot({ routes: "./src/routes" }),
      port: 0,
    });
    expect(plan.capabilities.requiresDatabase).toBe(false);
    expect(plan.config.projectConfig.databaseUrl).toBeUndefined();
    expect(plan.config.projectConfig.http.port).toBe(0);
    expect(() => assertModuleDatabaseConfigured(plan)).not.toThrow();
  });

  test("enables declared durable capabilities and custom route base", async () => {
    process.env.DATABASE_URL = "postgres://db";
    const root = moduleRoot({
      jobs: "./src/custom-jobs.ts",
      events: "./src/custom-events.ts",
      pipelines: "./src/custom-pipelines.ts",
    });
    writeFileSync(
      join(root, "module.config.ts"),
      "export default { projectConfig: { http: { api: { entryRouter: '/v1' } } } };\n",
    );
    const plan = await resolveModuleRuntimePlan({ packageDir: root });
    expect(plan.capabilities.workers).toEqual(["jobs", "events", "pipelines"]);
    expect(plan.config.services?.durability?.pollIntervalMs).toBe(250);
    expect(plan.config.services?.jobs?.concurrency).toBe(1);
    expect(plan.config.services?.events?.durable?.concurrency).toBe(1);
    expect(plan.config.services?.pipelines?.concurrency).toBe(1);
    expect(plan.routeBasePath).toBe("/v1");
    expect(() => assertModuleDatabaseConfigured(plan)).not.toThrow();
  });

  test("reports every database-backed capability when DATABASE_URL is absent", async () => {
    delete process.env.DATABASE_URL;
    const plan = await resolveModuleRuntimePlan({
      packageDir: moduleRoot({ models: "./src/models", jobs: "./src/jobs" }),
    });
    expect(() => assertModuleDatabaseConfigured(plan)).toThrow(
      ModuleDatabaseRequiredError,
    );
    expect(() => assertModuleDatabaseConfigured(plan)).toThrow(/models, jobs/);
  });

  test("selects system catalogs for declared durable work", async () => {
    process.env.DATABASE_URL = "postgres://db";
    const plan = await resolveModuleRuntimePlan({
      packageDir: moduleRoot({ jobs: "./jobs.ts", pipelines: "./flows.ts" }),
    });
    expect(standaloneMigrationCatalogs(plan).map(({ owner }) => owner)).toEqual(
      ["@damatjs/durability", "@damatjs/jobs", "@damatjs/pipelines"],
    );
    plan.capabilities.jobs = false;
    plan.capabilities.pipelines = false;
    plan.capabilities.events = true;
    expect(standaloneMigrationCatalogs(plan).map(({ owner }) => owner)).toEqual(
      ["@damatjs/durability", "@damatjs/events"],
    );
  });
});
