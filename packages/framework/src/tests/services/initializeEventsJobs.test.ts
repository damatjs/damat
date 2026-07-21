import { beforeEach, expect, test } from "bun:test";
import {
  config,
  initializeEventBroadcast,
  initializeJobs,
  instances,
  logger,
  reset,
} from "./initialize-events-jobs-fixture";

beforeEach(reset);

test("event broadcast and durable jobs register independent shutdowns", async () => {
  const value = config();
  value.projectConfig.redisUrl = "redis://test";
  value.services = {
    events: { broadcast: true },
    jobs: {},
  };
  const services = instances();
  await initializeEventBroadcast(value, services, logger as never);
  initializeJobs(value, services, logger as never);
  expect(services.shutdownHandlers.map(({ name }) => name)).toEqual([
    "event-broadcast",
    "job-worker",
  ]);
});
