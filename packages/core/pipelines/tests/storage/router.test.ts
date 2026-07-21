import { beforeEach, expect, test } from "bun:test";
import {
  clearPipelineRuntime,
  definePipeline,
  startPipeline,
  syncPipelineDefinitions,
} from "../../src";
import { ensureStorage, uniqueName } from "./context";
import { routeToTerminal } from "./pipeline-fixture";

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
  const run = await routeToTerminal(started.id);
  expect(run.status).toBe("succeeded");
  expect(run.output).toEqual({ delayed: 0 });
});
