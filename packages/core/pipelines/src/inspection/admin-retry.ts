import { recordAccelerationSignal, withIdempotency } from "@damatjs/durability";
import { retryJobRun } from "@damatjs/jobs";
import { appendPipelineActivity, type NodeExecutionRow } from "../repositories";
import { publishPipelineWakeup } from "../wakeup";
import { controlScope, validatePipelineAdminOptions } from "./admin-utils";
import type { PipelineAdminOptions } from "./types";

export async function retryPipelineNode(
  runId: string,
  nodeExecutionId: string,
  options: PipelineAdminOptions,
): Promise<void> {
  validatePipelineAdminOptions(options);
  await withIdempotency(
    {
      scope: controlScope(runId, `retry:${nodeExecutionId}`),
      key: options.idempotencyKey,
    },
    async (executor) => {
      const result = await executor.query<NodeExecutionRow>(
        `SELECT * FROM "_damat_pipeline_node_executions"
         WHERE "id"=$1 AND "run_id"=$2 FOR UPDATE`,
        [nodeExecutionId, runId],
      );
      const node = result.rows[0];
      if (
        !node ||
        !["failed", "compensation_failed", "cancelled"].includes(node.status)
      ) {
        throw new Error(
          "Only a failed or cancelled pipeline node can be retried",
        );
      }
      const downstream = await executor.query(
        `SELECT 1 FROM "_damat_pipeline_transitions" WHERE "from_execution_id"=$1 LIMIT 1`,
        [node.id],
      );
      if (downstream.rowCount)
        throw new Error(
          "A node with scheduled downstream work cannot be retried",
        );
      const retried = node.job_run_id
        ? await retryJobRun(node.job_run_id, { executor, actor: options.actor })
        : undefined;
      await executor.query(
        `UPDATE "_damat_pipeline_node_executions" SET "status"=$2,"error"=NULL,
           "output"=NULL,"completed_at"=NULL,"updated_at"=NOW(),
           "job_run_id"=CASE WHEN $3 THEN "job_run_id" ELSE NULL END
         WHERE "id"=$1`,
        [node.id, retried ? "queued" : "ready", Boolean(retried)],
      );
      await executor.query(
        `UPDATE "_damat_pipeline_runs" SET "status"=$2,"error"=NULL,
         "completed_at"=NULL,"retention_at"=NULL,"updated_at"=NOW() WHERE "id"=$1`,
        [runId, node.phase === "compensation" ? "compensating" : "running"],
      );
      await appendPipelineActivity(executor, {
        runId,
        nodeExecutionId,
        type: "node.retry_requested",
        details: {
          reason: options.reason,
          priorState: node.status,
          resultingState: retried ? "queued" : "ready",
        },
        actor: options.actor,
      });
      await recordAccelerationSignal({
        topic: "damat:pipelines:wakeup",
        kind: "pipeline",
        resourceId: runId,
        payload: { kind: "pipelines", projection: "upsert" },
        executor,
      });
      return null;
    },
  );
  await publishPipelineWakeup(runId);
}
