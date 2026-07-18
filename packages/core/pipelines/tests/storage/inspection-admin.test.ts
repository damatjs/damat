import { beforeEach, expect, test } from "bun:test";
import {
  clearPipelineRuntime,
  createPipelineInspectionClient,
  findPipelineRun,
  listPipelineNodeExecutions,
} from "../../src";
import { durability, ensureStorage, pool } from "./context";
import { startTestPipeline } from "./pipeline-fixture";

beforeEach(async () => {
  await ensureStorage();
  clearPipelineRuntime();
});
const client = () => createPipelineInspectionClient({
  cursorSigningKey: "admin-signing-key-with-at-least-32-bytes",
  client: durability,
});
const control = (key: string, reason = "admin coverage") => ({
  actor: { id: "operator", type: "user" as const }, reason, idempotencyKey: key,
});

test("active runs can be paused, resumed, and cancelled", async () => {
  const run = await startTestPipeline("admin-state");
  await client().pause(run.id, control("pause"));
  expect((await findPipelineRun(run.id))?.status).toBe("paused");
  await expect(client().pause(run.id, control("pause-again"))).rejects.toThrow("cannot be paused");
  await client().resume(run.id, control("resume"));
  expect((await findPipelineRun(run.id))?.status).toBe("running");
  await expect(client().resume(run.id, control("resume-again"))).rejects.toThrow("not paused");
  await client().cancel(run.id, control("cancel"));
  expect((await findPipelineRun(run.id))?.status).toBe("cancelled");
  expect((await listPipelineNodeExecutions(run.id))[0]?.status).toBe("cancelled");
});

test("failed nodes without downstream work can be retried", async () => {
  const run = await startTestPipeline("admin-retry", {
    start: "only", nodes: [{ id: "only", kind: "delay", delayMs: 0 }], edges: [],
  });
  const node = (await listPipelineNodeExecutions(run.id))[0]!;
  await pool.query(
    `UPDATE "_damat_pipeline_node_executions" SET "status"='failed',"error"='{"name":"Boom"}',"completed_at"=NOW() WHERE "id"=$1`,
    [node.id],
  );
  await pool.query(
    `UPDATE "_damat_pipeline_runs" SET "status"='failed',"completed_at"=NOW() WHERE "id"=$1`,
    [run.id],
  );
  await client().retryNode(run.id, node.id, control("retry"));
  expect((await listPipelineNodeExecutions(run.id))[0]?.status).toBe("ready");
  expect((await findPipelineRun(run.id))?.status).toBe("running");
  await expect(client().retryNode(run.id, node.id, control("retry-invalid"))).rejects.toThrow("failed or cancelled");
});

test("administrative controls validate targets and audit information", async () => {
  const missing = crypto.randomUUID();
  await expect(client().pause(missing, control("missing"))).rejects.toThrow("was not found");
  await expect(client().cancel(missing, control("cancel-missing"))).rejects.toThrow("was not found");
  await expect(client().pause(missing, control("reason", ""))).rejects.toThrow("reason is required");
  await expect(client().pause(missing, control("", "reason"))).rejects.toThrow("idempotency key");
});
