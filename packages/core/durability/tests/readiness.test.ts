import { expect, test } from "bun:test";
import {
  assertSystemMigrationsApplied,
  DurableInfrastructureNotMigratedError,
  type SystemMigration,
} from "../src";

const migrations: SystemMigration[] = [
  { owner: "@damatjs/durability", id: "001", order: 1, sql: "SELECT 1" },
  { owner: "@damatjs/jobs", id: "001", order: 2, sql: "SELECT 2" },
];

test("passes when every system migration is recorded", async () => {
  const executor = {
    query: async () => ({
      rows: migrations.map(({ owner, id }) => ({ owner, id })),
      rowCount: migrations.length,
    }),
  };
  await expect(
    assertSystemMigrationsApplied(executor, migrations),
  ).resolves.toBeUndefined();
});

test("reports missing migration identities as metadata", async () => {
  const executor = {
    query: async () => ({
      rows: [{ owner: "@damatjs/durability", id: "001" }],
      rowCount: 1,
    }),
  };
  try {
    await assertSystemMigrationsApplied(executor, migrations);
    throw new Error("expected readiness to fail");
  } catch (error) {
    expect(error).toBeInstanceOf(DurableInfrastructureNotMigratedError);
    expect((error as DurableInfrastructureNotMigratedError).missing).toEqual([
      { owner: "@damatjs/jobs", id: "001" },
    ]);
  }
});

test("turns a missing tracker table into the migration instruction", async () => {
  const executor = {
    query: async () => {
      throw new Error('relation "_damat_migration_logs" does not exist');
    },
  };
  await expect(
    assertSystemMigrationsApplied(executor, migrations),
  ).rejects.toThrow(
    "Durable infrastructure is not migrated. Run: bun run db:migrate",
  );
});

test("preserves database errors unrelated to a missing tracker", async () => {
  const executor = {
    query: async () => {
      throw new Error("connection refused");
    },
  };
  await expect(
    assertSystemMigrationsApplied(executor, migrations),
  ).rejects.toThrow("connection refused");
});
