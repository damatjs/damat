import { beforeEach, expect, test } from "bun:test";
import { defineJob } from "@damatjs/jobs";
import {
  clearPipelineRuntime,
  definePipeline,
  definePipelineAction,
  registerPipelineExecutorJob,
  registerPipelineJob,
  registerPipelineWorkflow,
  startPipeline,
  syncPipelineDefinitions,
} from "../../src";
import { ensureStorage, uniqueName } from "./context";
import { routeRunWithJobs } from "./router-job-fixture";

beforeEach(async () => {
  await ensureStorage();
  clearPipelineRuntime();
  registerPipelineExecutorJob();
});

test("router dispatches action, job, and workflow tasks with retry policy", async () => {
  const action = uniqueName("task-action");
  const job = uniqueName("task-job");
  const workflow = uniqueName("task-workflow");
  definePipelineAction({ name: action, handler: (input) => input });
  defineJob(job, async (input) => input);
  registerPipelineJob({
    name: job,
    inputSchema: { type: "number" },
    outputSchema: { type: "number" },
  });
  registerPipelineWorkflow({ name: workflow } as never);
  const definition = definePipeline(uniqueName("tasks"), {
    version: 1,
    start: "action",
    nodes: [
      {
        id: "action",
        kind: "action",
        name: action,
        input: 1,
        retry: { maxAttempts: 2, backoffMs: 3, backoffMultiplier: 2 },
      },
      { id: "job", kind: "job", name: job, input: 2 },
      { id: "workflow", kind: "workflow", name: workflow },
    ],
    edges: [
      { from: "action", to: "job" },
      { from: "job", to: "workflow" },
    ],
  });
  await syncPipelineDefinitions();
  const run = await startPipeline(
    definition.name,
    {},
    { correlationId: "correlation" },
  );
  expect((await routeRunWithJobs(run.id)).status).toBe("succeeded");
});

test("terminal job projection fails invalid outputs and terminal job states", async () => {
  const job = uniqueName("terminal-job");
  defineJob(job, async () => 1);
  registerPipelineJob({ name: job, outputSchema: { type: "number" } });
  const definition = definePipeline(uniqueName("terminal"), {
    version: 1,
    start: "job",
    nodes: [{ id: "job", kind: "job", name: job }],
    edges: [],
  });
  await syncPipelineDefinitions();
  const invalid = await startPipeline(definition.name, {});
  expect((await routeRunWithJobs(invalid.id, "succeeded", "bad")).status).toBe(
    "failed",
  );
  const dead = await startPipeline(
    definition.name,
    {},
    { idempotencyKey: crypto.randomUUID() },
  );
  expect((await routeRunWithJobs(dead.id, "dead_lettered")).status).toBe(
    "failed",
  );
  const cancelled = await startPipeline(
    definition.name,
    {},
    { idempotencyKey: crypto.randomUUID() },
  );
  expect((await routeRunWithJobs(cancelled.id, "cancelled")).status).toBe(
    "failed",
  );
});
