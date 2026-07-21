import {
  recordAccelerationSignal,
  withIdempotency,
  type DurabilityExecutor,
} from "@damatjs/durability";
import { appendPipelineActivity } from "../repositories";
import { publishPipelineWakeup } from "../wakeup";
import { controlScope, validatePipelineAdminOptions } from "./admin-utils";
import type { PipelineAdminOptions } from "./types";

export async function changePipelinePause(
  runId: string,
  paused: boolean,
  options: PipelineAdminOptions,
): Promise<void> {
  validatePipelineAdminOptions(options);
  const operation = paused ? "pause" : "resume";
  await withIdempotency(
    { scope: controlScope(runId, operation), key: options.idempotencyKey },
    async (executor) => {
      const current = await executor.query<{
        status: string;
        paused_from: string | null;
      }>(
        `SELECT "status","paused_from" FROM "_damat_pipeline_runs"
         WHERE "id"=$1 AND "completed_at" IS NULL FOR UPDATE`,
        [runId],
      );
      const prior = current.rows[0];
      if (!prior)
        throw new Error(`Active pipeline run "${runId}" was not found`);
      if (
        paused &&
        !["running", "waiting", "compensating"].includes(prior.status)
      ) {
        throw new Error(
          `Pipeline run "${runId}" cannot be paused from ${prior.status}`,
        );
      }
      if (!paused && prior.status !== "paused") {
        throw new Error(`Pipeline run "${runId}" is not paused`);
      }
      const status = paused
        ? "paused"
        : (prior.paused_from ?? (await resumedStatus(executor, runId)));
      const result = await executor.query(
        `UPDATE "_damat_pipeline_runs" SET "status"=$2,
         "paused_from"=CASE WHEN $3 THEN $4 ELSE NULL END,"updated_at"=NOW()
         WHERE "id"=$1 AND "completed_at" IS NULL`,
        [runId, status, paused, prior.status],
      );
      if (result.rowCount !== 1)
        throw new Error(`Active pipeline run "${runId}" was not found`);
      await appendPipelineActivity(executor, {
        runId,
        type: paused ? "paused" : "resumed",
        details: {
          reason: options.reason,
          priorState: prior.status,
          resultingState: status,
        },
        actor: options.actor,
      });
      await recordAccelerationSignal({
        topic: "damat:pipelines:wakeup",
        kind: "pipeline",
        resourceId: runId,
        payload: {
          kind: "pipelines",
          projection: paused ? "remove" : "upsert",
        },
        executor,
      });
      return null;
    },
  );
  if (!paused) await publishPipelineWakeup(runId);
}

async function resumedStatus(executor: DurabilityExecutor, runId: string) {
  const result = await executor.query(
    `SELECT 1 FROM "_damat_pipeline_node_executions"
     WHERE "run_id"=$1 AND "status"='waiting' LIMIT 1`,
    [runId],
  );
  return result.rowCount ? "waiting" : "running";
}
