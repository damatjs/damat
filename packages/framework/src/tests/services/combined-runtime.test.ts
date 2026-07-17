import { beforeEach, expect, test } from "bun:test";
import {
  config,
  instances,
  logger,
  reset,
  startWorkers,
  workerState,
} from "./initialize-events-jobs-fixture";

beforeEach(reset);

test("combined runtime starts both durable worker capabilities", () => {
  const value = config();
  value.services = { jobs: {}, events: { durable: {} } };
  startWorkers(value, instances(), logger as never, {
    mode: "worker",
    workers: ["jobs", "events"],
    servesHttp: false,
  });
  expect(workerState.started).toEqual(["jobs", "router", "events"]);
});

test("unavailable job selection fails before any worker starts", () => {
  const value = config();
  value.services = { events: { durable: {} } };
  expect(() =>
    startWorkers(value, instances(), logger as never, {
      mode: "worker",
      workers: ["jobs", "events"],
      servesHttp: false,
    }),
  ).toThrow(/jobs.*not enabled/i);
  expect(workerState.started).toEqual([]);
});
