import { withIdempotency } from "@damatjs/durability";
import { cancelJobRun } from "@damatjs/jobs";
import {
  appendPipelineActivity,
  markPipelineRunTerminal,
} from "../repositories";
import { controlScope, validatePipelineAdminOptions } from "./admin-utils";
import { lockActivePipelineTree } from "./admin-cancel-tree";
import type { PipelineAdminOptions } from "./types";

export async function cancelPipelineRun(
  runId: string,
  options: PipelineAdminOptions,
): Promise<void> {
  validatePipelineAdminOptions(options);
  await withIdempotency(
    { scope: controlScope(runId, "cancel"), key: options.idempotencyKey },
    async (executor) => {
      const active = await lockActivePipelineTree(executor, runId);
      const root = active.find((run) => run.id === runId);
      if (!root)
        throw new Error(`Active pipeline run "${runId}" was not found`);
      const runIds = active.map((run) => run.id);
      const jobs = await executor.query<{ job_run_id: string }>(
        `SELECT "job_run_id" FROM "_damat_pipeline_node_executions"
         WHERE "run_id"=ANY($1::uuid[]) AND "status" IN ('queued','running')
           AND "job_run_id" IS NOT NULL`,
        [runIds],
      );
      for (const job of jobs.rows) {
        await cancelJobRun(job.job_run_id, {
          executor,
          actor: options.actor,
          reason: options.reason,
        });
      }
      for (const run of active) {
        await markPipelineRunTerminal(executor, run.id, "cancelled");
      }
      await executor.query(
        `UPDATE "_damat_pipeline_node_executions" SET "status"='cancelled',
         "completed_at"=NOW(),"updated_at"=NOW()
         WHERE "run_id"=ANY($1::uuid[])
           AND "status" IN ('ready','queued','running','waiting')`,
        [runIds],
      );
      await appendPipelineActivity(executor, {
        runId,
        type: "cancelled",
        details: {
          reason: options.reason,
          priorState: root.status,
          resultingState: "cancelled",
          cancelledDescendants: runIds.length - 1,
        },
        actor: options.actor,
      });
      return null;
    },
  );
}
