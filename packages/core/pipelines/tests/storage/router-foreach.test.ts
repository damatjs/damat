import { beforeEach, expect, test } from "bun:test";
import {
  clearPipelineRuntime,
  definePipeline,
  listPipelineNodeExecutions,
  routePipelineCycle,
  startPipeline,
  syncPipelineDefinitions,
} from "../../src";
import { storedItems } from "../../src/router/foreach-children";
import { ensureStorage, pool, uniqueName } from "./context";
import { routeToTerminal } from "./pipeline-fixture";

beforeEach(async () => {
  await ensureStorage();
  clearPipelineRuntime();
});
const child = () =>
  definePipeline(uniqueName("foreach-child"), {
    version: 1,
    start: "wait",
    nodes: [{ id: "wait", kind: "delay" as const, delayMs: 0 }],
    edges: [],
  });
const parent = (pipeline: string, items: unknown, maxItems = 3) =>
  definePipeline(uniqueName("foreach-parent"), {
    version: 1,
    start: "each",
    nodes: [
      {
        id: "each",
        kind: "foreach",
        pipeline,
        items: items as never,
        maxItems,
        concurrency: 1,
      },
    ],
    edges: [],
  });

test("foreach handles empty, invalid, oversized, and bounded item sets", async () => {
  const nested = child();
  const empty = parent(nested.name, []);
  const invalid = parent(nested.name, "not-array");
  const oversized = parent(nested.name, [1, 2], 1);
  const bounded = parent(nested.name, [1, 2, 3]);
  await syncPipelineDefinitions();
  expect(
    (await routeToTerminal((await startPipeline(empty.name, {})).id)).status,
  ).toBe("succeeded");
  expect(
    (await routeToTerminal((await startPipeline(invalid.name, {})).id)).status,
  ).toBe("failed");
  expect(
    (await routeToTerminal((await startPipeline(oversized.name, {})).id))
      .status,
  ).toBe("failed");
  expect(
    (await routeToTerminal((await startPipeline(bounded.name, {})).id)).status,
  ).toBe("succeeded");
  expect(storedItems({ input: { items: [1] } } as never)).toEqual([1]);
  expect(() => storedItems({ node_id: "each", input: null } as never)).toThrow(
    "no stored item",
  );
});

test("foreach projects a failed child as a node failure", async () => {
  const nested = child();
  const definition = parent(nested.name, [1]);
  await syncPipelineDefinitions();
  const run = await startPipeline(definition.name, {});
  await routePipelineCycle(100);
  const execution = (await listPipelineNodeExecutions(run.id))[0]!;
  const childRun = await pool.query(
    `SELECT "id" FROM "_damat_pipeline_runs" WHERE "parent_node_execution_id"=$1`,
    [execution.id],
  );
  await pool.query(
    `UPDATE "_damat_pipeline_runs" SET "status"='failed',"completed_at"=NOW(),
     "retention_at"=NOW()+INTERVAL '1 day' WHERE "id"=$1`,
    [childRun.rows[0]!.id],
  );
  expect((await routeToTerminal(run.id)).status).toBe("failed");
});
