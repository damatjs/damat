import type { DurabilityExecutor } from "@damatjs/durability";
import { appendJobActivity } from "../repositories";
import type { ClaimCandidateRow } from "./claim-row";

export async function recoverExpiredClaim(
  executor: DurabilityExecutor,
  row: ClaimCandidateRow,
): Promise<boolean> {
  await executor.query(
    `UPDATE "_damat_job_attempts"
     SET "finished_at" = NOW(), "outcome" = 'lost',
       "duration_ms" = GREATEST(0, EXTRACT(EPOCH FROM (NOW()-"started_at"))*1000)
     WHERE "run_id" = $1 AND "attempt_number" = $2 AND "finished_at" IS NULL`,
    [row.id, row.attempt_count],
  );
  const status = row.cancellation_requested_at
    ? "cancelled"
    : row.attempt_count >= row.max_attempts
      ? "dead_lettered"
      : undefined;
  if (!status) return false;
  await executor.query(
    `UPDATE "_damat_job_runs" SET "status"=$2, "lease_owner"=NULL,
     "lease_token"=NULL, "lease_expires_at"=NULL, "completed_at"=NOW(),
     "updated_at"=NOW() WHERE "id"=$1`,
    [row.id, status],
  );
  await appendJobActivity(executor, {
    runId: row.id,
    attemptNumber: row.attempt_count,
    type: status,
    previousStatus: "running",
    nextStatus: status,
    reason: "expired lease",
  });
  return true;
}
