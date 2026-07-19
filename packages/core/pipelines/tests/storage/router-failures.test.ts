import { beforeEach, expect, test } from "bun:test";
import {
  clearPipelineRuntime,
  definePipeline,
  definePipelineAction,
  registerPipelineExecutorJob,
  routePipelineCycle,
  routePipelines,
  startPipeline,
  syncPipelineDefinitions,
} from "../../src";
import { ensureStorage, uniqueName } from "./context";
import { routeRunWithJobs } from "./router-job-fixture";
import { routeToTerminal } from "./pipeline-fixture";

beforeEach(async () => {
  await ensureStorage();
  clearPipelineRuntime();
  registerPipelineExecutorJob();
});

const failingPipeline = (policy: "edge" | "continue") => {
  const action = uniqueName(`failure-${policy}`);
  definePipelineAction({ name: action, handler: () => null });
  return definePipeline(uniqueName(`failure-${policy}`), {
    version: 1,
    start: "task",
    nodes: [
      {
        id: "task",
        kind: "action",
        name: action,
        ...(policy === "continue" ? { failure: "continue" as const } : {}),
      },
      { id: "after", kind: "delay", delayMs: 0 },
    ],
    edges: [
      {
        from: "task",
        to: "after",
        ...(policy === "edge" ? { on: "failure" as const } : {}),
      },
    ],
  });
};

test("failure edges and continue policies schedule downstream work", async () => {
  const edge = failingPipeline("edge");
  const continued = failingPipeline("continue");
  await syncPipelineDefinitions();
  expect(
    (
      await routeRunWithJobs(
        (await startPipeline(edge.name, {})).id,
        "dead_lettered",
      )
    ).status,
  ).toBe("succeeded");
  expect(
    (
      await routeRunWithJobs(
        (await startPipeline(continued.name, {})).id,
        "dead_lettered",
      )
    ).status,
  ).toBe("succeeded");
});

test("invalid pipeline output fails during idle completion", async () => {
  const definition = definePipeline(uniqueName("invalid-output"), {
    version: 1,
    start: "delay",
    nodes: [{ id: "delay", kind: "delay", delayMs: 0 }],
    edges: [],
    output: "wrong",
    outputSchema: { type: "number" },
  });
  await syncPipelineDefinitions();
  expect(
    (await routeToTerminal((await startPipeline(definition.name, {})).id))
      .status,
  ).toBe("failed");
});

test("route contracts validate limits, expose counts, and run retention", async () => {
  await expect(routePipelineCycle(0)).rejects.toThrow("between 1 and 1000");
  await expect(routePipelineCycle(1_001)).rejects.toThrow("between 1 and 1000");
  expect(await routePipelines(1)).toBeNumber();
  expect((await routePipelineCycle(1, true)).count).toBeNumber();
});
