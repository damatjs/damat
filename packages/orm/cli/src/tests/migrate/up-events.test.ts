import { expect, test } from "bun:test";
import {
  context,
  loadUp,
  setupMigrateFixture,
  state,
  writeConfig,
} from "./fixture";
import { systemMigrationKeys } from "./systemMigrationKeys";

setupMigrateFixture();

test.serial(
  "up passes event-only system migrations in owner order",
  async () => {
    writeConfig({ modules: {}, services: "events:{durable:{}}" });
    state.runResult = [{ success: true }];
    expect((await (await loadUp()).handler(context().ctx)).exitCode).toBe(0);
    expect(systemMigrationKeys(state.runArgs.options.systemMigrations)).toEqual(
      [
        "@damatjs/durability:001",
        "@damatjs/durability:002",
        "@damatjs/events:001",
        "@damatjs/events:002",
        "@damatjs/events:003",
      ],
    );
  },
);

test.serial("up orders jobs before events when both are enabled", async () => {
  writeConfig({
    modules: {},
    services: "jobs:{},events:{durable:{}}",
  });
  state.runResult = [{ success: true }];
  expect((await (await loadUp()).handler(context().ctx)).exitCode).toBe(0);
  expect(
    systemMigrationKeys(state.runArgs.options.systemMigrations).slice(-5),
  ).toEqual([
    "@damatjs/jobs:001",
    "@damatjs/jobs:002",
    "@damatjs/events:001",
    "@damatjs/events:002",
    "@damatjs/events:003",
  ]);
});
