import { beforeEach, expect, test } from "bun:test";
import {
  clearPipelineRuntime,
  definePipeline,
  routePipelineCycle,
  signalPipelineRun,
  startPipeline,
  syncPipelineDefinitions,
} from "../../src";
import { durability, ensureStorage, uniqueName } from "./context";

beforeEach(async () => {
  await ensureStorage();
  clearPipelineRuntime();
});
const actor = { id: "caller", type: "user" as const };
const signal = (key: string, executor?: never) => ({
  actor, reason: "client coverage", idempotencyKey: key, ...(executor ? { executor } : {}),
});

test("start validates names, published versions, schemas, and executors", async () => {
  await expect(startPipeline("", {})).rejects.toThrow("name is required");
  await expect(startPipeline(uniqueName("missing"), {})).rejects.toThrow("was not found");
  await expect(startPipeline("name", {}, { executor: durability as never })).rejects.toThrow("active transaction executor");
  const name = uniqueName("schema");
  definePipeline(name, {
    version: 1, start: "only", edges: [],
    inputSchema: { type: "object", required: ["id"] },
    nodes: [{ id: "only", kind: "delay", delayMs: 0 }],
  });
  await syncPipelineDefinitions();
  await expect(startPipeline(name, {})).rejects.toThrow(`pipeline.${name}.input.id`);
  const run = await durability.transaction((executor) =>
    startPipeline(name, { id: "ok" }, { executor, correlationId: "c" }),
  );
  expect(run.correlationId).toBe("c");
});

test("declared signals are durable, idempotent, and transaction-aware", async () => {
  const name = uniqueName("signal");
  definePipeline(name, {
    version: 1, start: "wait", edges: [],
    nodes: [{ id: "wait", kind: "signal.wait", signal: "approve" }],
  });
  await syncPipelineDefinitions();
  const run = await startPipeline(name, {});
  const first = await signalPipelineRun(run.id, "approve", { value: 1 }, signal("one"));
  expect(await signalPipelineRun(run.id, "approve", null, signal("one"))).toBe(first);
  await durability.transaction(async (executor) => {
    expect(await signalPipelineRun(run.id, "approve", {}, signal("two", executor as never))).toBeString();
  });
  await expect(signalPipelineRun(run.id, "other", {}, signal("other"))).rejects.toThrow("not declared");
  await expect(signalPipelineRun(run.id, "approve", {}, signal("bad", durability as never))).rejects.toThrow("active transaction executor");
  await routePipelineCycle(100);
  await expect(signalPipelineRun(run.id, "approve", {}, signal("late"))).rejects.toThrow("was not found");
});

test("signal calls validate all required audit fields", async () => {
  for (const [runId, name, key, reason] of [
    ["", "go", "key", "reason"], ["run", "", "key", "reason"],
    ["run", "go", "", "reason"], ["run", "go", "key", ""],
  ]) {
    await expect(signalPipelineRun(runId, name, {}, { actor, idempotencyKey: key, reason })).rejects.toThrow("required");
  }
});
