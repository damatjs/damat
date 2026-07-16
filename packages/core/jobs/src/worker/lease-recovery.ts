import type { DurabilityExecutor } from "@damatjs/durability";
import { appendJobActivity, type JobRunStatus } from "../repositories";

export interface ExpiredJobLease {
  id: string;
  attempt_count: number;
  max_attempts: number;
  cancellation_requested_at: Date | null;
  lease_owner: string;
  lease_token: string;
}

export async function recoverExpiredJobLease(
  executor: DurabilityExecutor,
  row: ExpiredJobLease,
): Promise<JobRunStatus> {
  await executor.query(
    `UPDATE "_damat_job_attempts" SET "finished_at"=NOW(),"outcome"='lost',
       "duration_ms"=GREATEST(0,EXTRACT(EPOCH FROM (NOW()-"started_at"))*1000)
     WHERE "run_id"=$1 AND "attempt_number"=$2 AND "finished_at" IS NULL`,
    [row.id, row.attempt_count],
  );
  const status: JobRunStatus = row.cancellation_requested_at
    ? "cancelled"
    : row.attempt_count >= row.max_attempts
      ? "dead_lettered"
      : "queued";
  await executor.query(
    `UPDATE "_damat_job_runs" SET "status"=$2,"lease_owner"=NULL,
       "lease_token"=NULL,"lease_expires_at"=NULL,"heartbeat_at"=NULL,
       "available_at"=CASE WHEN $2='queued' THEN NOW() ELSE "available_at" END,
       "completed_at"=CASE WHEN $2='queued' THEN NULL ELSE NOW() END,"updated_at"=NOW()
     WHERE "id"=$1`,
    [row.id, status],
  );
  await appendJobActivity(executor, {
    runId: row.id,
    attemptNumber: row.attempt_count,
    type: "lease_recovered",
    previousStatus: "running",
    nextStatus: status,
    workerId: row.lease_owner,
    leaseToken: row.lease_token,
    reason: "expired lease",
  });
  return status;
}
