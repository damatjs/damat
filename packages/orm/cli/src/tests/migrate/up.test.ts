import { expect, test } from "bun:test";
import {
  context,
  FakePool,
  loadUp,
  logged,
  setupMigrateFixture,
  state,
  USER,
  writeConfig,
  writeThrowingConfig,
} from "./fixture";
import { systemMigrationKeys } from "./systemMigrationKeys";

setupMigrateFixture();

test.serial("up reports missing config before creating a pool", async () => {
  const { ctx, calls } = context();
  expect((await (await loadUp()).handler(ctx)).exitCode).toBe(1);
  expect(logged(calls, "error", /Failed to load config/)).toBe(true);
  expect(state.connections).toHaveLength(0);
});

test.serial("up rejects an empty module map", async () => {
  writeConfig({ modules: {} });
  const { ctx, calls } = context();
  expect((await (await loadUp()).handler(ctx)).exitCode).toBe(1);
  expect(logged(calls, "error", /No module or system migrations/)).toBe(true);
});

test.serial("up allows system migrations without modules", async () => {
  writeConfig({ modules: {}, services: "jobs:{}" });
  state.runResult = [{ success: true }];
  const { ctx } = context();
  expect((await (await loadUp()).handler(ctx)).exitCode).toBe(0);
  expect(state.runArgs.modules).toEqual({});
  expect(systemMigrationKeys(state.runArgs.options.systemMigrations)).toEqual([
    "@damatjs/durability:001",
    "@damatjs/durability:002",
    "@damatjs/jobs:001",
    "@damatjs/jobs:002",
  ]);
});

test.serial(
  "up rejects missing and unreadable database configuration",
  async () => {
    writeConfig({ modules: { user: USER }, databaseUrl: null });
    let result = await (await loadUp()).handler(context().ctx);
    expect(result.exitCode).toBe(1);
    writeThrowingConfig();
    const { ctx, calls } = context();
    result = await (await loadUp()).handler(ctx);
    expect(result.exitCode).toBe(1);
    expect(logged(calls, "error", /Failed to load database config/)).toBe(true);
  },
);

test.serial(
  "up passes selected system migrations and closes the pool",
  async () => {
    writeConfig({ modules: { user: USER }, services: "jobs:{}" });
    state.runResult = [{ success: true }, { success: true }];
    const { ctx, calls } = context();
    expect((await (await loadUp()).handler(ctx)).exitCode).toBe(0);
    expect(state.runArgs.pool).toBeInstanceOf(FakePool);
    expect(state.runArgs.modules.user.resolve).toBe(USER);
    expect(state.runArgs.options.systemMigrations).toHaveLength(4);
    expect(state.ends).toBe(1);
    expect(logged(calls, "success", /completed successfully/)).toBe(true);
  },
);

test.serial(
  "up reports migration failures and still closes the pool",
  async () => {
    writeConfig({ modules: { user: USER } });
    state.runResult = [{ success: false, error: new Error("failed") }];
    const { ctx, calls } = context();
    expect((await (await loadUp()).handler(ctx)).exitCode).toBe(1);
    expect(logged(calls, "error", /Migration failed/)).toBe(true);
    expect(state.ends).toBe(1);
  },
);
