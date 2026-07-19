import { beforeEach, expect, test } from "bun:test";
import { defineJob } from "@damatjs/jobs";
import {
  clearPipelineRuntime,
  createPipelineInspectionClient,
  definePipeline,
  listPipelineNodeExecutions,
  registerPipelineJob,
  routePipelineCycle,
  startPipeline,
  syncPipelineDefinitions,
} from "../../src";
import { durability, ensureStorage, pool, uniqueName } from "./context";

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

test("cancelling and retrying pipeline job nodes delegates to durable jobs", async () => {
  const job = uniqueName("admin-job");
  defineJob(job, async () => null);
  registerPipelineJob({ name: job });
  const definition = definePipeline(uniqueName("admin-job-pipeline"), {
    version: 1,
    start: "job",
    nodes: [{ id: "job", kind: "job", name: job }],
    edges: [],
  });
  await syncPipelineDefinitions();
  const cancelled = await startPipeline(definition.name, {});
  await routePipelineCycle(100);
  const cancelledNode = (await listPipelineNodeExecutions(cancelled.id))[0]!;
  await client().cancel(cancelled.id, control("cancel-job"));
  const jobStatus = await pool.query(
    `SELECT "status" FROM "_damat_job_runs" WHERE "id"=$1`,
    [cancelledNode.jobRunId],
  );
  expect(jobStatus.rows[0]?.status).toBe("cancelled");

  const retried = await startPipeline(
    definition.name,
    {},
    { idempotencyKey: crypto.randomUUID() },
  );
  await routePipelineCycle(100);
  const retriedNode = (await listPipelineNodeExecutions(retried.id))[0]!;
  await pool.query(
    `UPDATE "_damat_job_runs" SET "status"='dead_lettered',"completed_at"=NOW() WHERE "id"=$1`,
    [retriedNode.jobRunId],
  );
  await pool.query(
    `UPDATE "_damat_pipeline_node_executions" SET "status"='failed',"completed_at"=NOW() WHERE "id"=$1`,
    [retriedNode.id],
  );
  await pool.query(
    `UPDATE "_damat_pipeline_runs" SET "status"='failed',"completed_at"=NOW() WHERE "id"=$1`,
    [retried.id],
  );
  await client().retryNode(retried.id, retriedNode.id, control("retry-job"));
  expect((await listPipelineNodeExecutions(retried.id))[0]?.status).toBe(
    "queued",
  );
});
