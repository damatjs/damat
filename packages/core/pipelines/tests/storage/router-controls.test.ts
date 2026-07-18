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

test("fork, join, and condition nodes route a converging graph", async () => {
  const definition = definePipeline(uniqueName("controls"), {
    version: 1,
    start: "fork",
    nodes: [
      { id: "fork", kind: "fork" },
      { id: "left", kind: "delay", delayMs: 0 },
      { id: "right", kind: "delay", delayMs: 0 },
      { id: "join", kind: "join", join: "all" },
      { id: "condition", kind: "condition", expression: { op: "exists", value: { $ref: "input.enabled" } } },
    ],
    edges: [
      { from: "fork", to: "left" },
      { from: "fork", to: "right" },
      { from: "left", to: "join" },
      { from: "right", to: "join" },
      { from: "join", to: "condition" },
    ],
  });
  await syncPipelineDefinitions();
  const run = await startPipeline(definition.name, { enabled: true });
  expect((await routeToTerminal(run.id)).status).toBe("succeeded");
});
