import { beforeEach, expect, test } from "bun:test";
import { defineJob, enqueueJob } from "@damatjs/jobs";
import {
  clearPipelineRuntime,
  createPipelineInspectionClient,
  findPipelineRun,
  listPipelineNodeExecutions,
  runPipelineRetention,
} from "../../src";
import { durability, ensureStorage, pool, uniqueName } from "./context";
import { startTestPipeline } from "./pipeline-fixture";

beforeEach(async () => {
  await ensureStorage();
  clearPipelineRuntime();
});
const request = (key: string) => ({
  actor: { id: "retention-test", type: "system" as const },
  reason: "coverage retention",
  idempotencyKey: key,
});

test("retention deletes complete root trees and their pipeline-owned jobs", async () => {
  const root = await startTestPipeline("retention-root");
  const node = (await listPipelineNodeExecutions(root.id))[0]!;
  const jobName = uniqueName("retention-job");
  defineJob(jobName, async () => null);
  const job = await enqueueJob(jobName, {});
  await pool.query(
    `UPDATE "_damat_pipeline_node_executions" SET "job_run_id"=$2 WHERE "id"=$1`,
    [node.id, job.id],
  );
  await pool.query(
    `UPDATE "_damat_pipeline_runs" SET "status"='succeeded',"completed_at"=NOW(),
     "retention_at"=NOW()-INTERVAL '1 day' WHERE "id"=$1`,
    [root.id],
  );
  const key = `retention-${crypto.randomUUID()}`;
  const result = await runPipelineRetention({ ...request(key), batchSize: 1 });
  expect(result).toEqual({ deletedRuns: 1, deletedJobs: 1 });
  expect(await findPipelineRun(root.id)).toBeUndefined();
  expect((await pool.query(`SELECT 1 FROM "_damat_job_runs" WHERE "id"=$1`, [job.id])).rowCount).toBe(0);
  expect(await runPipelineRetention({ ...request(key), batchSize: 1 })).toEqual(result);
  const inspection = createPipelineInspectionClient({
    cursorSigningKey: "retention-signing-key-at-least-32-bytes",
    client: durability,
  });
  expect(await inspection.runRetention(request(`empty-${crypto.randomUUID()}`))).toEqual({
    deletedRuns: 0,
    deletedJobs: 0,
  });
});

test("retention validates dates, bounds, and audited controls", async () => {
  await expect(runPipelineRetention({ ...request("date"), terminalBefore: new Date("invalid") })).rejects.toThrow("valid date");
  for (const batchSize of [0, 1_001, 1.5]) {
    await expect(runPipelineRetention({ ...request(`batch-${batchSize}`), batchSize })).rejects.toThrow("between 1 and 1000");
  }
  await expect(runPipelineRetention({ ...request("reason"), reason: " " })).rejects.toThrow("reason");
  await expect(runPipelineRetention({ ...request(" ") })).rejects.toThrow("idempotency");
  await expect(runPipelineRetention({ ...request("actor"), actor: { id: "", type: "system" } })).rejects.toThrow();
});
