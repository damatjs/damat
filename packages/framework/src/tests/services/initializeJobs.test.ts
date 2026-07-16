import { beforeEach, expect, test } from "bun:test";
import {
  config,
  initializeJobs,
  instances,
  logger,
  reset,
  state,
} from "./initialize-events-jobs-fixture";

beforeEach(reset);

test("jobs configure PostgreSQL durability without requiring Redis", async () => {
  const value = config();
  delete value.projectConfig.redisUrl;
  value.services = {
    jobs: { worker: true, queue: "mail", concurrency: 3, pollIntervalMs: 25 },
  };
  const services = instances();
  initializeJobs(value, services, logger as never);
  expect(state.durabilityClients).toHaveLength(1);
  expect(state.workers).toMatchObject([
    { queue: "mail", concurrency: 3, pollIntervalMs: 25 },
  ]);
  expect(state.started).toBe(1);
  await services.shutdownHandlers[0]!.handler();
  expect(state.stopped).toBe(1);
});

test("jobs fail startup without a database", () => {
  const value = config();
  delete value.projectConfig.databaseUrl;
  value.services = { jobs: { worker: true } };
  expect(() => initializeJobs(value, instances(), logger as never)).toThrow(
    /databaseUrl/,
  );
  expect(state.workers).toEqual([]);
  expect(state.warnings).toEqual([]);
});
