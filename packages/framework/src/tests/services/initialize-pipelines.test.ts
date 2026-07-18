import { beforeEach, expect, test } from "bun:test";
import type { AppConfig } from "../../config";
import type { ServiceInstances } from "../../services/types";
import {
  initializePipelineDefinitions,
  initializePipelines,
  reset,
  startWorkers,
  state,
} from "./initialize-pipelines-fixture";

beforeEach(reset);

const services = (): ServiceInstances => ({
  healthChecks: {},
  shutdownHandlers: [],
});
const config = (): AppConfig => ({
  projectConfig: { http: { host: "localhost", port: 3000 } },
  services: {
    durability: { pollIntervalMs: 25, retentionIntervalMs: 500 },
    pipelines: {
      queue: "orchestration",
      concurrency: 3,
      routerBatchSize: 20,
      retentionMs: "forever",
    },
  },
  runtime: { shutdownGraceMs: 40 },
});

test("pipeline definitions validate, synchronize, and clear process bindings", async () => {
  state.definitions.push({ name: "onboarding", manifest: {} });
  const instances = services();
  await initializePipelineDefinitions(config(), instances);
  expect(state.defaults).toEqual([
    {
      retentionMs: "forever",
      jobs: false,
      events: false,
    },
  ]);
  expect(state.executorQueues).toEqual(["orchestration"]);
  expect(state.listeners).toHaveLength(1);
  await (state.listeners[0] as (value: { pipeline: string }) => Promise<void>)({
    pipeline: "run-1",
  });
  expect(state.synced).toBe(1);
  await instances.shutdownHandlers[0]!.handler();
  expect(state.cleared).toBe(2);
});

test("unavailable capabilities fail pipeline initialization", async () => {
  state.definitions.push({ name: "broken", manifest: {} });
  state.errors.push("job missing");
  await expect(
    initializePipelineDefinitions(config(), services()),
  ).rejects.toThrow('Pipeline "broken" is unavailable: job missing');
});

test("pipeline worker uses shared runtime options and graceful shutdown", async () => {
  const instances = services();
  instances.durabilityCoordinator = {} as never;
  startWorkers(config(), instances, {} as never, {
    mode: "worker",
    workers: ["pipelines"],
    servesHttp: false,
  });
  expect(state.routers[0]).toMatchObject({
    batchSize: 20,
    retentionIntervalMs: 500,
  });
  expect(state.workers[0]).toMatchObject({
    queue: "orchestration",
    concurrency: 3,
  });
  expect(state.started).toEqual(["router", "jobs"]);
  await instances.shutdownHandlers[0]!.handler();
  await instances.shutdownHandlers[1]!.handler();
  expect(state.stopped).toEqual(["router", "jobs"]);
});

test("disabled pipeline service creates no definitions or workers", async () => {
  const value = config();
  value.services = {};
  await initializePipelineDefinitions(value, services());
  expect(initializePipelines(value, services(), {} as never)).toBeUndefined();
});
