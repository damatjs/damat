import { expect, test } from "bun:test";
import {
  context,
  loadStatus,
  logged,
  POST,
  setupMigrateFixture,
  state,
  USER,
  writeConfig,
} from "./fixture";
import { systemMigrationKeys } from "./systemMigrationKeys";

setupMigrateFixture();

test.serial("status reports missing config and empty modules", async () => {
  let view = context();
  expect((await (await loadStatus()).handler(view.ctx)).exitCode).toBe(1);
  expect(logged(view.calls, "error", /Failed to load config/)).toBe(true);
  writeConfig({ modules: {} });
  view = context();
  expect((await (await loadStatus()).handler(view.ctx)).exitCode).toBe(1);
  expect(logged(view.calls, "error", /No module or system migrations/)).toBe(
    true,
  );
});

test.serial("status allows system migrations without modules", async () => {
  writeConfig({ modules: {}, services: "jobs:{}" });
  state.status.modules = [
    { name: "@damatjs/durability", applied: 0, pending: 2, migrations: [] },
  ];
  expect((await (await loadStatus()).handler(context().ctx)).exitCode).toBe(0);
  expect(state.statusArgs.modules).toEqual({});
});

test.serial("status rejects a missing database URL", async () => {
  writeConfig({ modules: { user: USER }, databaseUrl: null });
  const { ctx, calls } = context();
  expect((await (await loadStatus()).handler(ctx)).exitCode).toBe(1);
  expect(logged(calls, "error", /No databaseUrl found/)).toBe(true);
});

test.serial("status reports all modules and system owners", async () => {
  writeConfig({ modules: { user: USER, post: POST }, services: "jobs:{}" });
  state.status.modules = [
    { name: "@damatjs/durability", applied: 2, pending: 0, migrations: [] },
    {
      name: "post",
      applied: 1,
      pending: 1,
      migrations: [{ name: "002", applied: false }],
    },
  ];
  const { ctx, calls } = context();
  expect((await (await loadStatus()).handler(ctx)).exitCode).toBe(0);
  expect(
    systemMigrationKeys(state.statusArgs.options.systemMigrations),
  ).toEqual([
    "@damatjs/durability:001",
    "@damatjs/durability:002",
    "@damatjs/durability:003",
    "@damatjs/durability:004",
    "@damatjs/jobs:001",
    "@damatjs/jobs:002",
    "@damatjs/jobs:003",
  ]);
  expect(logged(calls, "success", /durability: 2 applied/)).toBe(true);
  expect(logged(calls, "info", /post: 1 applied, 1 pending/)).toBe(true);
  expect(state.ends).toBe(1);
});

test.serial(
  "status reports one module selected by option or argument",
  async () => {
    writeConfig({ modules: { user: USER } });
    state.moduleStatus.module = {
      name: "user",
      applied: 1,
      pending: 1,
      migrations: [{ name: "002", applied: false }],
    };
    expect(
      (await (await loadStatus()).handler(context([], { module: "user" }).ctx))
        .exitCode,
    ).toBe(0);
    expect(state.moduleStatusArgs.module.resolve).toBe(USER);
    expect(
      (await (await loadStatus()).handler(context(["user"]).ctx)).exitCode,
    ).toBe(0);
  },
);
