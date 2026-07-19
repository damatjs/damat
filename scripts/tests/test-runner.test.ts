import { expect, test } from "bun:test";

const root = new URL("../../", import.meta.url);

async function readJson(path: string): Promise<Record<string, any>> {
  return Bun.file(new URL(path, root)).json();
}

test("root tests use the isolated repository runner", async () => {
  const packageJson = await readJson("package.json");
  expect(packageJson.scripts.test).toBe("bun scripts/test/run.ts");
});

test("Turbo never replays cached test results", async () => {
  const turbo = await readJson("turbo.json");
  expect(turbo.tasks.test.cache).toBeFalse();
});

test("type checks build dependency declarations without task races", async () => {
  const turbo = await readJson("turbo.json");
  expect(turbo.tasks["check-types"].dependsOn).toEqual(["^build"]);
  expect(turbo.tasks.build.dependsOn).toContain("check-types");
});

test("source commands are not hidden by build-output ignores", async () => {
  const path = "packages/cli/app/src/commands/build/index.ts";
  const check = Bun.spawn(["git", "check-ignore", "--no-index", path], {
    cwd: root.pathname,
    stdout: "ignore",
    stderr: "ignore",
  });
  expect(await check.exited).toBe(1);
});

const databasePackages = [
  ["packages/core/durability", "DAMAT_DURABILITY_DATABASE_URL"],
  ["packages/core/jobs", "DAMAT_JOBS_DATABASE_URL"],
  ["packages/core/events", "DAMAT_EVENTS_DATABASE_URL"],
  ["packages/core/pipelines", "DAMAT_PIPELINES_DATABASE_URL"],
  ["packages/link", "DAMAT_LINK_DATABASE_URL"],
  ["packages/service", "DAMAT_SERVICES_DATABASE_URL"],
  ["packages/orm/pg", "DAMAT_ORM_PG_DATABASE_URL"],
] as const;

test("database packages select their isolated test database", async () => {
  for (const [path, variable] of databasePackages) {
    const packageJson = await readJson(`${path}/package.json`);
    expect(packageJson.scripts.test).toContain("scripts/test/package.ts");
    expect(packageJson.scripts.test).toContain(variable);
  }
});

test("event database fixtures run serially", async () => {
  const packageJson = await readJson("packages/core/events/package.json");
  expect(packageJson.scripts.test).toContain("--max-concurrency=1");
});

test("Turbo forwards every isolated database URL", async () => {
  const turbo = await readJson("turbo.json");
  for (const [, variable] of databasePackages) {
    expect(turbo.tasks.test.env).toContain(variable);
  }
});

test("root tests provision crash-recovery dependencies", async () => {
  const runner = await Bun.file(new URL("scripts/test/run.ts", root)).text();
  expect(runner).toContain("startTestRedis");
  expect(runner).toContain("prepareRecoveryDatabase");
  const turbo = await readJson("turbo.json");
  expect(turbo.tasks.test.env).toContain("DAMAT_RECOVERY_DATABASE_URL");
  expect(turbo.tasks.test.env).toContain("DAMAT_RECOVERY_REDIS_URL");
});

test("root tests reject unloaded production source", async () => {
  const runner = await Bun.file(new URL("scripts/test/run.ts", root)).text();
  expect(runner).toContain("scripts/check-coverage-sources.ts");
  expect(runner).toContain("turboArgs.length === 0");
});
