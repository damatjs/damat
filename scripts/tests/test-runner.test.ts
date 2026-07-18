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

const databasePackages = [
  ["packages/core/durability", "DAMAT_DURABILITY_DATABASE_URL"],
  ["packages/core/jobs", "DAMAT_JOBS_DATABASE_URL"],
  ["packages/core/events", "DAMAT_EVENTS_DATABASE_URL"],
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
