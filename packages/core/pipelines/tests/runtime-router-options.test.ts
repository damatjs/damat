import { expect, test } from "bun:test";
import { resolvePipelineRouterOptions } from "../src/runtime/router-options";
import { pipelineWorkflowObserver } from "../src/runtime/workflow-observer";

test("router options apply defaults and retain a supplied coordinator", () => {
  expect(resolvePipelineRouterOptions({})).toEqual({
    pollIntervalMs: 5_000,
    retryIntervalMs: 1_000,
    batchSize: 100,
    retentionIntervalMs: 3_600_000,
  });
  const coordinator = { run: () => Promise.resolve({}), pollInterval: () => 1 };
  expect(resolvePipelineRouterOptions({
    pollIntervalMs: 2,
    retryIntervalMs: 3,
    batchSize: 4,
    retentionIntervalMs: 5,
    coordinator: coordinator as never,
  }).coordinator).toBe(coordinator);
});

test("router options reject unsafe intervals and oversized batches", () => {
  for (const options of [
    { pollIntervalMs: 0 },
    { retryIntervalMs: 1.5 },
    { batchSize: Number.MAX_SAFE_INTEGER + 1 },
    { retentionIntervalMs: -1 },
  ]) expect(() => resolvePipelineRouterOptions(options)).toThrow("positive safe integer");
  expect(() => resolvePipelineRouterOptions({ batchSize: 1_001 })).toThrow("cannot exceed");
});

test("workflow observer writes structured activity through the job context", async () => {
  const calls: unknown[][] = [];
  const observer = pipelineWorkflowObserver({
    log: async (...values: unknown[]) => void calls.push(values),
  } as never);
  await observer.onEvent?.({ type: "step.started", step: "reserve" } as never);
  expect(calls).toEqual([
    ["info", "Workflow activity", { workflowEvent: { type: "step.started", step: "reserve" } }],
  ]);
});
