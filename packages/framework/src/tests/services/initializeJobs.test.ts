import { beforeEach, expect, test } from "bun:test";
import {
  config,
  initializeJobs,
  instances,
  logger,
  reset,
  state,
  workerState,
} from "./initialize-events-jobs-fixture";

beforeEach(reset);

test("jobs configure PostgreSQL durability without requiring Redis", async () => {
  const value = config();
  delete value.projectConfig.redisUrl;
  value.services = {
    durability: { pollIntervalMs: 25 },
    jobs: { queue: "mail", concurrency: 3 },
  };
  const services = instances();
  initializeJobs(value, services, logger as never);
  expect(workerState.jobs).toMatchObject([
    { queue: "mail", concurrency: 3, pollIntervalMs: 25 },
  ]);
  expect(workerState.started).toEqual(["jobs"]);
  await services.shutdownHandlers[0]!.handler();
  expect(workerState.stopped).toEqual(["jobs"]);
});

test("jobs do not configure the durability client themselves", () => {
  const value = config();
  value.services = { jobs: {} };
  initializeJobs(value, instances(), logger as never);
  expect(state.durabilityClients).toEqual([]);
});
