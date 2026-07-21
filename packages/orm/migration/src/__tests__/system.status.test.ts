import { expect, test } from "bun:test";
import type { SystemMigration } from "@damatjs/durability";
import { getMigrationStatus } from "../executor/status";
import { createSystemMigrationPool } from "./system.fixture";

const migrations: SystemMigration[] = [
  { owner: "@damatjs/durability", id: "001", order: 1, sql: "ONE" },
  { owner: "@damatjs/durability", id: "002", order: 2, sql: "TWO" },
  { owner: "@damatjs/jobs", id: "001", order: 3, sql: "THREE" },
];

test("includes system owners in migration status", async () => {
  const fake = createSystemMigrationPool();
  fake.applied.set("@damatjs/durability", new Set(["001"]));
  const status = await getMigrationStatus(
    fake.pool,
    {},
    {
      systemMigrations: migrations,
    },
  );
  expect(status.modules.map((item) => item.name)).toEqual([
    "@damatjs/durability",
    "@damatjs/jobs",
  ]);
  expect(status.modules[0]).toMatchObject({ applied: 1, pending: 1 });
  expect(status.modules[1]).toMatchObject({ applied: 0, pending: 1 });
});
