import { beforeEach, expect, test } from "bun:test";
import {
  clearPipelineRuntime,
  definePipeline,
  findPipelineRun,
  routePipelineCycle,
  startPipeline,
  syncPipelineDefinitions,
} from "../../src";
import { ensureStorage, uniqueName } from "./context";

beforeEach(async () => {
  await ensureStorage();
  clearPipelineRuntime();
});

test("router completes delayed nodes and evaluates explicit pipeline output", async () => {
  const definition = definePipeline(uniqueName("pipeline-router"), {
    version: 1,
    start: "first",
    nodes: [
      { id: "first", kind: "delay", delayMs: 0 },
      { id: "finish", kind: "delay", delayMs: 0 },
    ],
    edges: [{ from: "first", to: "finish" }],
    output: { delayed: { $ref: "nodes.finish.output.delayedMs" } },
    outputSchema: {
      type: "object",
      required: ["delayed"],
      properties: { delayed: { type: "number" } },
    },
  });
  await syncPipelineDefinitions();
  const started = await startPipeline(definition.name, {});
  for (let index = 0; index < 8; index++) {
    await routePipelineCycle(100);
    if ((await findPipelineRun(started.id))?.completedAt) break;
  }
  const run = await findPipelineRun(started.id);
  expect(run?.status).toBe("succeeded");
  expect(run?.output).toEqual({ delayed: 0 });
});
