import { beforeEach, expect, test } from "bun:test";
import {
  clearPipelineRuntime,
  definePipeline,
  findActivePipelineVersion,
  listPipelineNodeExecutions,
  routePipelineCycle,
  startPipeline,
  syncPipelineDefinitions,
} from "../../src";
import { durability, ensureStorage, pool, uniqueName } from "./context";
import { routeToTerminal } from "./pipeline-fixture";

beforeEach(async () => {
  await ensureStorage();
  clearPipelineRuntime();
});
const childGraph = {
  version: 1,
  start: "wait",
  nodes: [{ id: "wait", kind: "delay" as const, delayMs: 0 }],
  edges: [],
};

test("child nodes pin lineage and project successful child output", async () => {
  const child = definePipeline(uniqueName("child"), childGraph);
  const parent = definePipeline(uniqueName("parent"), {
    version: 1,
    start: "child",
    nodes: [{ id: "child", kind: "child", pipeline: child.name }],
    edges: [],
  });
  await syncPipelineDefinitions();
  const run = await startPipeline(parent.name, {});
  expect((await routeToTerminal(run.id)).status).toBe("succeeded");
});

test("child nodes honor explicit versions and project child failure", async () => {
  const child = definePipeline(uniqueName("failed-child"), childGraph);
  await syncPipelineDefinitions();
  const version = await durability.transaction((executor) =>
    findActivePipelineVersion(executor, child.name),
  );
  clearPipelineRuntime();
  const parent = definePipeline(uniqueName("failed-parent"), {
    version: 1,
    start: "child",
    nodes: [
      {
        id: "child",
        kind: "child",
        pipeline: child.name,
        versionId: version!.id,
      },
    ],
    edges: [],
  });
  await syncPipelineDefinitions();
  const run = await startPipeline(parent.name, {});
  await routePipelineCycle(100);
  const execution = (await listPipelineNodeExecutions(run.id))[0]!;
  expect(execution.childRunId).toBeString();
  await pool.query(
    `UPDATE "_damat_pipeline_runs" SET "status"='failed',"error"='{"name":"Child"}',
     "completed_at"=NOW(),"retention_at"=NOW()+INTERVAL '1 day' WHERE "id"=$1`,
    [execution.childRunId],
  );
  expect((await routeToTerminal(run.id)).status).toBe("failed");
});
