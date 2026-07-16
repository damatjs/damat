import { afterEach, expect, test } from "bun:test";
import type { SystemMigration } from "@damatjs/durability";
import { runMigrations } from "../executor/run";
import { createModule, createSystemMigrationPool } from "./system.fixture";

const cleanups: Array<() => void> = [];
afterEach(() => cleanups.splice(0).forEach((cleanup) => cleanup()));

const migrations: SystemMigration[] = [
  { owner: "@damatjs/durability", id: "001", order: 1, sql: "SYSTEM 1" },
  { owner: "@damatjs/durability", id: "002", order: 2, sql: "SYSTEM 2" },
];

test("runs system migrations before modules and records their owner", async () => {
  const fake = createSystemMigrationPool();
  const module = createModule("MODULE");
  cleanups.push(module.cleanup);
  const results = await runMigrations(fake.pool, module.modules, {
    systemMigrations: migrations,
  });
  expect(fake.sql.indexOf("SYSTEM 2")).toBeLessThan(fake.sql.indexOf("MODULE"));
  expect(fake.inserts.slice(0, 2).map((params) => params.slice(1, 3))).toEqual([
    ["@damatjs/durability", "001"],
    ["@damatjs/durability", "002"],
  ]);
  expect(results.every((result) => result.success)).toBe(true);
});

test("skips system migrations already applied by an earlier run", async () => {
  const fake = createSystemMigrationPool();
  await runMigrations(fake.pool, {}, { systemMigrations: migrations });
  await runMigrations(fake.pool, {}, { systemMigrations: migrations });
  expect(fake.sql.filter((statement) => statement === "SYSTEM 1")).toHaveLength(
    1,
  );
});

test("stops later system and module migrations after a failure", async () => {
  const fake = createSystemMigrationPool("SYSTEM 1");
  const module = createModule("MODULE");
  cleanups.push(module.cleanup);
  const results = await runMigrations(fake.pool, module.modules, {
    systemMigrations: migrations,
  });
  expect(results.some((result) => !result.success)).toBe(true);
  expect(fake.sql).not.toContain("SYSTEM 2");
  expect(fake.sql).not.toContain("MODULE");
});

test("rolls back system SQL when recording the tracker row fails", async () => {
  const fake = createSystemMigrationPool();
  fake.failTracker(true);
  let results = await runMigrations(
    fake.pool,
    {},
    {
      systemMigrations: migrations.slice(0, 1),
    },
  );
  expect(results[0]?.success).toBe(false);
  expect(fake.sql).not.toContain("COMMIT");
  expect(fake.sql).toContain("ROLLBACK");
  fake.failTracker(false);
  results = await runMigrations(
    fake.pool,
    {},
    {
      systemMigrations: migrations.slice(0, 1),
    },
  );
  expect(results[0]?.success).toBe(true);
  expect(fake.sql.filter((sql) => sql === "SYSTEM 1")).toHaveLength(2);
});
