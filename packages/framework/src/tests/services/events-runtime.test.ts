import { beforeEach, expect, test } from "bun:test";
import {
  config,
  instances,
  logger,
  reset,
  state,
  startWorkers,
  workerState,
} from "./initialize-events-jobs-fixture";

beforeEach(reset);

test("events runtime starts and stops router plus registered consumers", async () => {
  const value = config();
  value.runtime = { shutdownGraceMs: 50 };
  value.services = {
    durability: { pollIntervalMs: 25, reconcileBatchSize: 20 },
    events: {
      durable: {
        concurrency: 4,
        router: { pollIntervalMs: 30, batchSize: 10 },
      },
    },
  };
  const services = instances();
  startWorkers(value, services, logger as never, {
    mode: "worker",
    workers: ["events"],
    servesHttp: false,
  });
  expect(workerState.routers).toMatchObject([
    { pollIntervalMs: 30, batchSize: 10 },
  ]);
  expect(workerState.events).toMatchObject([
    {
      consumers: [{ event: "mail.sent", consumer: "audit" }],
      concurrency: 4,
      pollIntervalMs: 25,
      reconcileBatchSize: 20,
    },
  ]);
  expect(workerState.started).toEqual(["router", "events"]);
  expect(services.shutdownHandlers.map(({ phase }) => phase)).toEqual([
    "claims",
    "claims",
  ]);
  await services.shutdownHandlers[0]!.handler();
  await services.shutdownHandlers[1]!.handler();
  expect(workerState.stopped).toEqual(["router", "events"]);
});

test("events selection fails when durable events are unavailable", () => {
  const value = config();
  value.services = { events: { broadcast: true } };
  expect(() =>
    startWorkers(value, instances(), logger as never, {
      mode: "worker",
      workers: ["events"],
      servesHttp: false,
    }),
  ).toThrow(/events.*not enabled/i);
});

test("producer-only events start a router without an event worker", async () => {
  state.eventDefinitions = [{ name: "mail.sent", consumers: new Map() }];
  const value = config();
  value.services = { events: { durable: {} } };
  const services = instances();
  startWorkers(value, services, logger as never, {
    mode: "worker",
    workers: ["events"],
    servesHttp: false,
  });
  expect(workerState.started).toEqual(["router"]);
  expect(workerState.events).toEqual([]);
  expect(services.shutdownHandlers.map(({ name }) => name)).toEqual([
    "event-router",
  ]);
  await services.shutdownHandlers[0]!.handler();
});
