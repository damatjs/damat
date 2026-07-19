import { beforeEach, expect, test } from "bun:test";
import {
  clearPipelineRuntime,
  createPipelineInspectionClient,
  findPipelineRun,
  listPipelineNodeExecutions,
} from "../../src";
import { durability, ensureStorage, pool } from "./context";
import { routeUntil, startTestPipeline } from "./pipeline-fixture";

beforeEach(async () => {
  await ensureStorage();
  clearPipelineRuntime();
});
const client = () =>
  createPipelineInspectionClient({
    cursorSigningKey: "admin-branches-signing-key-at-least-32-bytes",
    client: durability,
  });
const control = (key: string) => ({
  actor: { id: "operator", type: "user" as const },
  reason: "branch coverage",
  idempotencyKey: key,
});

test("resume reconstructs waiting state when the prior state is unavailable", async () => {
  const run = await startTestPipeline("resume-waiting");
  await client().pause(run.id, control("pause-waiting"));
  await pool.query(
    `UPDATE "_damat_pipeline_runs" SET "paused_from"=NULL WHERE "id"=$1`,
    [run.id],
  );
  await pool.query(
    `UPDATE "_damat_pipeline_node_executions" SET "status"='waiting' WHERE "run_id"=$1`,
    [run.id],
  );
  await client().resume(run.id, control("resume-waiting"));
  expect((await findPipelineRun(run.id))?.status).toBe("waiting");
});

test("retry rejects a node after it has scheduled downstream work", async () => {
  const run = await startTestPipeline("retry-downstream");
  const nodes = await routeUntil(
    () => listPipelineNodeExecutions(run.id),
    (value) => value.some((node) => node.nodeId === "last"),
    `downstream work for pipeline run ${run.id}`,
  );
  const first = nodes.find((node) => node.nodeId === "first")!;
  await pool.query(
    `UPDATE "_damat_pipeline_node_executions" SET "status"='failed',"completed_at"=NOW() WHERE "id"=$1`,
    [first.id],
  );
  await pool.query(
    `UPDATE "_damat_pipeline_runs" SET "status"='failed',"completed_at"=NOW() WHERE "id"=$1`,
    [run.id],
  );
  await expect(
    client().retryNode(run.id, first.id, control("retry-downstream")),
  ).rejects.toThrow("downstream work");
});
