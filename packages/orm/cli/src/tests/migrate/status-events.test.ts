import { expect, test } from "bun:test";
import {
  context,
  loadStatus,
  setupMigrateFixture,
  state,
  writeConfig,
} from "./fixture";
import { systemMigrationKeys } from "./systemMigrationKeys";

setupMigrateFixture();

test.serial("status reports durable event system migrations", async () => {
  writeConfig({ modules: {}, services: "events:{durable:{}}" });
  state.status.modules = [
    { name: "@damatjs/events", applied: 0, pending: 2, migrations: [] },
  ];
  expect((await (await loadStatus()).handler(context().ctx)).exitCode).toBe(0);
  expect(
    systemMigrationKeys(state.statusArgs.options.systemMigrations),
  ).toEqual([
    "@damatjs/durability:001",
    "@damatjs/durability:002",
    "@damatjs/events:001",
    "@damatjs/events:002",
  ]);
});
