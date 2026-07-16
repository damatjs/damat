import type { DurabilityExecutor, JsonValue } from "@damatjs/durability";
import { appendJobActivity } from "../repositories";
import type { JobRunStatus } from "../repositories";
import { JobLeaseLostError } from "./errors";
import type { ClaimedJobRun } from "./types";

export interface FinishInput {
  status: "retry_wait" | "succeeded" | "dead_lettered" | "cancelled";
  outcome: "retry_wait" | "succeeded" | "dead_lettered" | "cancelled";
  result?: JsonValue;
  error?: Record<string, unknown>;
  availableAt?: Date;
}

export async function finishClaim(
  executor: DurabilityExecutor,
  claim: ClaimedJobRun,
  input: FinishInput,
): Promise<void> {
  const terminal = input.status !== "retry_wait";
  const updated = await executor.query<{ progress: unknown }>(
    `UPDATE "_damat_job_runs" SET "status"=$4, "result"=$5::jsonb,
       "last_error"=$6::jsonb, "available_at"=COALESCE($7,"available_at"),
       "lease_owner"=NULL, "lease_token"=NULL, "lease_expires_at"=NULL,
       "heartbeat_at"=NULL, "updated_at"=NOW(),
       "completed_at"=CASE WHEN $8 THEN NOW() ELSE NULL END
     WHERE "id"=$1 AND "status"='running' AND "lease_owner"=$2
       AND "lease_token"=$3 AND "lease_expires_at">NOW()
     RETURNING "progress"`,
    [
      claim.id,
      claim.workerId,
      claim.leaseToken,
      input.status,
      input.result === undefined ? null : JSON.stringify(input.result),
      input.error ? JSON.stringify(input.error) : null,
      input.availableAt ?? null,
      terminal,
    ],
  );
  if (updated.rowCount !== 1) throw new JobLeaseLostError(claim.id);
  await closeAttempt(executor, claim, input);
  await appendFinishActivity(
    executor,
    claim,
    input.status,
    terminal ? updated.rows[0]?.progress : undefined,
  );
}

async function closeAttempt(
  executor: DurabilityExecutor,
  claim: ClaimedJobRun,
  input: FinishInput,
): Promise<void> {
  await executor.query(
    `UPDATE "_damat_job_attempts" SET "finished_at"=NOW(),
       "duration_ms"=GREATEST(0,EXTRACT(EPOCH FROM (NOW()-"started_at"))*1000),
       "result"=$4::jsonb, "outcome"=$5, "error"=$6::jsonb
     WHERE "run_id"=$1 AND "attempt_number"=$2 AND "lease_token"=$3
       AND "finished_at" IS NULL`,
    [
      claim.id,
      claim.attemptCount,
      claim.leaseToken,
      input.result === undefined ? null : JSON.stringify(input.result),
      input.outcome,
      input.error ? JSON.stringify(input.error) : null,
    ],
  );
}

async function appendFinishActivity(
  executor: DurabilityExecutor,
  claim: ClaimedJobRun,
  status: JobRunStatus,
  progress?: unknown,
): Promise<void> {
  await appendJobActivity(executor, {
    runId: claim.id,
    attemptNumber: claim.attemptCount,
    type: status,
    previousStatus: "running",
    nextStatus: status,
    workerId: claim.workerId,
    leaseToken: claim.leaseToken,
    ...(progress === undefined ? {} : { metadata: { progress } }),
  });
}
