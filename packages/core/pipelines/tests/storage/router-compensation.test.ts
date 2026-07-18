import { beforeEach, expect, test } from "bun:test";
import {
  clearPipelineRuntime,
  definePipeline,
  definePipelineAction,
  findPipelineRun,
  listPipelineNodeExecutions,
  registerPipelineExecutorJob,
  routePipelineCycle,
  startPipeline,
  syncPipelineDefinitions,
} from "../../src";
import { ensureStorage, uniqueName } from "./context";
import { settleQueuedPipelineJobs } from "./router-job-fixture";

beforeEach(async () => {
  await ensureStorage();
  clearPipelineRuntime();
  registerPipelineExecutorJob();
});

async function compensatedRun(compensation: "succeeded" | "dead_lettered", explicitInput: boolean) {
  const forward = uniqueName("compensated-forward");
  const failing = uniqueName("compensated-failure");
  const undo = uniqueName("compensated-undo");
  for (const name of [forward, failing, undo]) definePipelineAction({ name, handler: (input) => input });
  const definition = definePipeline(uniqueName("compensated"), {
    version: 1,
    start: "forward",
    nodes: [
      { id: "forward", kind: "action", name: forward,
        compensateWith: { kind: "action", name: undo,
          ...(explicitInput ? { input: { $ref: "nodes.forward.output" } } : {}) } },
      { id: "failure", kind: "action", name: failing, failure: "compensate" },
    ],
    edges: [{ from: "forward", to: "failure" }],
  });
  await syncPipelineDefinitions();
  const started = await startPipeline(definition.name, {});
  for (let cycle = 0; cycle < 20; cycle += 1) {
    await routePipelineCycle(100);
    const nodes = await listPipelineNodeExecutions(started.id);
    for (const node of nodes.filter((value) => value.status === "queued")) {
      const status = node.phase === "compensation"
        ? compensation
        : node.nodeId === "failure" ? "dead_lettered" : "succeeded";
      await settleQueuedPipelineJobs(started.id, status, { value: node.nodeId });
    }
    const run = await findPipelineRun(started.id);
    if (run?.completedAt) return run;
  }
  throw new Error("compensation did not finish");
}

test("successful compensation preserves the originating failure", async () => {
  const run = await compensatedRun("succeeded", true);
  expect(run.status).toBe("compensated");
  expect(run.error?.message).not.toContain("ended as succeeded");
});

test("failed compensation terminates with both failure records", async () => {
  const run = await compensatedRun("dead_lettered", false);
  expect(run.status).toBe("compensation_failed");
  expect(run.error?.name).toBe("CompensationFailed");
});
