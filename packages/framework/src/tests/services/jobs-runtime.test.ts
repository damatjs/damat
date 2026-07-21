import { beforeEach, expect, test } from "bun:test";
import {
  config,
  instances,
  logger,
  reset,
  startWorkers,
  workerState,
} from "./initialize-events-jobs-fixture";
import { getWorkerWakeupRedis } from "../../services/initialize/wakeup";

beforeEach(reset);

test("server runtime never starts a job worker", () => {
  const value = config();
  value.services = { jobs: { queue: "mail", concurrency: 3 } };
  startWorkers(value, instances(), logger as never, {
    mode: "server",
    workers: [],
    servesHttp: true,
  });
  expect(workerState.jobs).toEqual([]);
});

test("jobs runtime starts only the configured job worker", async () => {
  const value = config();
  value.services = {
    durability: { pollIntervalMs: 25, leaseMs: 500 },
    jobs: { queue: "mail", concurrency: 3 },
  };
  const services = instances();
  startWorkers(value, services, logger as never, {
    mode: "worker",
    workers: ["jobs"],
    servesHttp: false,
  });
  expect(workerState.jobs).toMatchObject([
    { queue: "mail", concurrency: 3, pollIntervalMs: 25, leaseMs: 500 },
  ]);
  expect(workerState.started).toEqual(["jobs"]);
  expect(services.shutdownHandlers[0]).toMatchObject({
    name: "job-worker",
    phase: "claims",
  });
  await services.shutdownHandlers[0]!.handler();
  expect(workerState.stopped).toEqual(["jobs"]);
});

test("configured Redis enables optional worker wakeups", () => {
  const value = config();
  value.projectConfig.redisUrl = "redis://test";
  const redis = { duplicate: () => ({}) };
  expect(
    getWorkerWakeupRedis(
      value,
      () => redis as never,
      () => true,
    ),
  ).toBe(redis);
});

test("worker polling remains available when wakeups are disabled", async () => {
  const value = config();
  value.runtime = { shutdownGraceMs: 10 };
  value.services = { durability: { wakeups: false }, jobs: {} };
  const services = instances();
  startWorkers(value, services, logger as never, {
    mode: "worker",
    workers: ["jobs"],
    servesHttp: false,
  });
  expect(workerState.jobs[0]).not.toHaveProperty("wakeupRedis");
  await services.shutdownHandlers[0]!.handler();
});
