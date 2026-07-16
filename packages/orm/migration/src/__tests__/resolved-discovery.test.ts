import { afterEach, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { discoverAllMigrations } from "../discovery/allMigrations";
import { discoverModuleMigrations } from "../discovery/moduleMigrations";

let root = "";
afterEach(() => rmSync(root, { recursive: true, force: true }));

test("discovers migrations from an explicit resolved directory", () => {
  root = mkdtempSync(join(tmpdir(), "damat-migrations-"));
  const migrations = join(root, "package/sql");
  mkdirSync(migrations, { recursive: true });
  writeFileSync(
    join(migrations, "Migration20260716000000_Init.sql"),
    "-- sql\n",
  );
  const found = discoverModuleMigrations({
    resolve: join(root, "package"),
    migrations,
  });
  expect(found).toHaveLength(1);
  expect(found[0]?.path).toBe(
    join(migrations, "Migration20260716000000_Init.sql"),
  );
});

test("all-module discovery keeps explicit migration directories", () => {
  root = mkdtempSync(join(tmpdir(), "damat-all-migrations-"));
  const migrations = join(root, "package/sql");
  mkdirSync(migrations, { recursive: true });
  writeFileSync(
    join(migrations, "Migration20260716000000_Init.sql"),
    "-- sql\n",
  );
  const found = discoverAllMigrations([
    { resolve: join(root, "package"), migrations },
  ]);
  expect(found).toHaveLength(1);
});
