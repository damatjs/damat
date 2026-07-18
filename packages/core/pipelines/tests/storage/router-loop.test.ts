import { beforeEach, expect, test } from "bun:test";
import {
  clearPipelineRuntime,
  definePipeline,
  listPipelineNodeExecutions,
  routePipelineCycle,
  startPipeline,
  syncPipelineDefinitions,
} from "../../src";
import { ensureStorage, pool, uniqueName } from "./context";
import { routeToTerminal } from "./pipeline-fixture";

beforeEach(async () => {
  await ensureStorage();
  clearPipelineRuntime();
});
const child = () => definePipeline(uniqueName("loop-child"), {
  version: 1, start: "wait", nodes: [{ id: "wait", kind: "delay" as const, delayMs: 0 }], edges: [],
});
const loop = (pipeline: string, until: never, maxIterations: number) => definePipeline(uniqueName("loop-parent"), {
  version: 1,
  start: "loop",
  nodes: [{ id: "loop", kind: "loop", pipeline, until, maxIterations }],
  edges: [],
});

test("loop nodes complete, iterate, and enforce their configured bound", async () => {
  const nested = child();
  const immediate = loop(nested.name, { op: "exists", value: { $ref: "item" } } as never, 2);
  const repeated = loop(nested.name, { op: "gte", left: { $ref: "iteration" }, right: 2 } as never, 2);
  const limited = loop(nested.name, { op: "eq", left: 1, right: 2 } as never, 1);
  await syncPipelineDefinitions();
  expect((await routeToTerminal((await startPipeline(immediate.name, {})).id)).status).toBe("succeeded");
  expect((await routeToTerminal((await startPipeline(repeated.name, {})).id)).status).toBe("succeeded");
  expect((await routeToTerminal((await startPipeline(limited.name, {})).id)).status).toBe("failed");
});

test("loop nodes project a failed child", async () => {
  const nested = child();
  const definition = loop(nested.name, { op: "eq", left: 1, right: 1 } as never, 2);
  await syncPipelineDefinitions();
  const run = await startPipeline(definition.name, {});
  await routePipelineCycle(100);
  const execution = (await listPipelineNodeExecutions(run.id))[0]!;
  const childRun = await pool.query(`SELECT "id" FROM "_damat_pipeline_runs" WHERE "parent_node_execution_id"=$1`, [execution.id]);
  await pool.query(
    `UPDATE "_damat_pipeline_runs" SET "status"='failed',"completed_at"=NOW(),
     "retention_at"=NOW()+INTERVAL '1 day' WHERE "id"=$1`, [childRun.rows[0]!.id],
  );
  expect((await routeToTerminal(run.id)).status).toBe("failed");
});
