import { expect, test } from "bun:test";
import {
  collectSystemMigrations,
  durabilitySystemMigrations,
  type SystemMigrationCatalog,
} from "../src";

const catalogA: SystemMigrationCatalog = {
  owner: "@damatjs/a",
  migrations: [{ owner: "@damatjs/a", id: "001", order: 20, sql: "A" }],
};
const catalogB: SystemMigrationCatalog = {
  owner: "@damatjs/b",
  migrations: [{ owner: "@damatjs/b", id: "002", order: 10, sql: "B" }],
};

test("orders system migrations globally", () => {
  expect(
    collectSystemMigrations([catalogA, catalogB]).map((item) => item.id),
  ).toEqual(["002", "001"]);
});

test("rejects duplicate owner and migration identifiers", () => {
  const duplicate: SystemMigrationCatalog = {
    owner: "@damatjs/a",
    migrations: [{ owner: "@damatjs/a", id: "001", order: 30, sql: "C" }],
  };
  expect(() => collectSystemMigrations([catalogA, duplicate])).toThrow(
    /duplicate/i,
  );
});

test("rejects migrations assigned to another catalog owner", () => {
  const mismatched: SystemMigrationCatalog = {
    owner: "@damatjs/a",
    migrations: [{ owner: "@damatjs/b", id: "001", order: 1, sql: "A" }],
  };
  expect(() => collectSystemMigrations([mismatched])).toThrow(/owner/i);
});

test("declares the shared durability tables with explicit names", () => {
  const sql = durabilitySystemMigrations.migrations
    .map((migration) => migration.sql)
    .join("\n");
  for (const table of [
    "_damat_idempotency_keys",
    "_damat_workers",
    "_damat_work_controls",
    "_damat_work_control_activity",
    "_damat_maintenance_activity",
  ]) {
    expect(sql).toContain(`"${table}"`);
  }
  expect(sql).not.toMatch(/CONSTRAINT\s+(?!")/);
  expect(sql).not.toMatch(/INDEX IF NOT EXISTS\s+(?!")/);
});
