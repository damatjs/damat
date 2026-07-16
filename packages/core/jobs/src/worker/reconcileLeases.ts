import {
  getDurabilityClient,
  type DurabilityExecutor,
} from "@damatjs/durability";
import { appendJobActivity } from "../repositories";
import type { JobRunStatus } from "../repositories";
import { reconcileLimit, type ReconcileOptions } from "./reconcile-options";

interface ExpiredLeaseRow {
  id: string;
  attempt_count: number;
  max_attempts: number;
  cancellation_requested_at: Date | null;
}

export async function reconcileExpiredJobLeases(
  options: ReconcileOptions = {},
): Promise<number> {
  const limit = reconcileLimit(options.limit);
  return getDurabilityClient().transaction((executor) =>
    recover(executor, limit, options.queue),
  );
}

async function recover(
  executor: DurabilityExecutor,
  limit: number,
  queue?: string,
): Promise<number> {
  const result = await executor.query<ExpiredLeaseRow>(
    `SELECT "id","attempt_count","max_attempts","cancellation_requested_at"
     FROM "_damat_job_runs" WHERE "status"='running'
       AND "lease_expires_at" <= NOW()
       AND ($2::text IS NULL OR "queue"=$2)
     ORDER BY "lease_expires_at","id" FOR UPDATE SKIP LOCKED LIMIT $1`,
    [limit, queue ?? null],
  );
  for (const row of result.rows) await recoverOne(executor, row);
  return result.rows.length;
}

async function recoverOne(
  executor: DurabilityExecutor,
  row: ExpiredLeaseRow,
): Promise<void> {
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
    reason: "expired lease",
  });
}
