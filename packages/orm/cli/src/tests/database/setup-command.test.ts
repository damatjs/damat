import { expect, test } from "bun:test";
import {
  context,
  loadDatabaseSetup,
  logged,
  setupMigrateFixture,
  state,
  writeConfig,
} from "../migrate/fixture";

setupMigrateFixture();

test.serial("database:setup reports missing configuration", async () => {
  const { ctx, calls } = context();
  expect((await (await loadDatabaseSetup()).handler(ctx)).exitCode).toBe(1);
  expect(logged(calls, "error", /Database setup failed/)).toBe(true);

  writeConfig({ modules: {}, databaseUrl: null });
  const missing = context();
  expect(
    (await (await loadDatabaseSetup()).handler(missing.ctx)).exitCode,
  ).toBe(1);
  expect(logged(missing.calls, "error", /DATABASE_URL is not configured/)).toBe(
    true,
  );
});

test.serial(
  "database:setup reuses an existing database then migrates",
  async () => {
    writeConfig({
      modules: {},
      services: "jobs:{}",
      databaseUrl: "postgres://db/app",
    });
    const { ctx, calls } = context();
    expect((await (await loadDatabaseSetup()).handler(ctx)).exitCode).toBe(0);
    expect(logged(calls, "info", /already exists/)).toBe(true);
    expect(state.runArgs.options.systemMigrations.length).toBeGreaterThan(0);
    expect(state.connections).toHaveLength(2);
  },
);

test.serial(
  "database:setup creates a missing database then migrates",
  async () => {
    writeConfig({
      modules: {},
      services: "jobs:{}",
      databaseUrl: "postgres://db/app",
    });
    state.clientConnectErrors = [
      Object.assign(new Error("missing"), { code: "3D000" }),
      null,
    ];
    state.clientRows = [];
    const { ctx, calls } = context();
    expect((await (await loadDatabaseSetup()).handler(ctx)).exitCode).toBe(0);
    expect(logged(calls, "success", /database created/)).toBe(true);
    expect(
      state.clientQueries.some(({ sql }) => sql.startsWith("CREATE")),
    ).toBe(true);
  },
);

test.serial("database:setup reports connection failures", async () => {
  writeConfig({
    modules: {},
    services: "jobs:{}",
    databaseUrl: "postgres://db/app",
  });
  state.clientConnectErrors = [new Error("authentication failed")];
  const { ctx, calls } = context();
  expect((await (await loadDatabaseSetup()).handler(ctx)).exitCode).toBe(1);
  expect(logged(calls, "error", /authentication failed/)).toBe(true);
});
