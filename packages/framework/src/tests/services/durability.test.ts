import { beforeEach, expect, test } from "bun:test";
import {
  config,
  FakeNotMigratedError,
  initializeDurability,
  reset,
  state,
} from "./initialize-events-jobs-fixture";

beforeEach(reset);

test("ordinary events remain database optional", async () => {
  const value = config();
  delete value.projectConfig.databaseUrl;
  value.services = { events: { broadcast: true } };
  await initializeDurability(value);
  expect(state.durabilityClients).toEqual([]);
  expect(state.readiness).toEqual([]);
});

test("jobs configure the pool-backed client after readiness", async () => {
  const value = config();
  value.services = { jobs: {} };
  await initializeDurability(value);
  expect(state.durabilityClients).toHaveLength(1);
  expect(state.readiness[0]).toEqual([{ id: "shared" }, { id: "jobs" }]);
});

test("durable events include only their enabled migrations", async () => {
  const value = config();
  value.services = { events: { durable: {} } };
  await initializeDurability(value);
  expect(state.readiness[0]).toEqual([{ id: "shared" }, { id: "events" }]);
});

test("durable services require database configuration", async () => {
  const value = config();
  delete value.projectConfig.databaseUrl;
  value.services = { jobs: {} };
  const error = await initializeDurability(value).catch((cause) => cause);
  expect(error).toBeInstanceOf(Error);
  expect((error as Error).message).toBe(
    "Configure projectConfig.databaseUrl, then run: damat-orm migrate:up",
  );
});

test("migration readiness failures give the exact recovery command", async () => {
  const value = config();
  value.services = { jobs: {} };
  state.readinessError = new FakeNotMigratedError("tables missing");
  expect(initializeDurability(value)).rejects.toThrow(/damat-orm migrate:up/);
});
