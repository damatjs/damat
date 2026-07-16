import {
  getDurabilityClient,
  type DurabilityExecutor,
} from "@damatjs/durability";
import { recoverExpiredJobLease, type ExpiredJobLease } from "./lease-recovery";
import { reconcileLimit, type ReconcileOptions } from "./reconcile-options";

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
  const result = await executor.query<ExpiredJobLease>(
    `SELECT "id","attempt_count","max_attempts","cancellation_requested_at",
       "lease_owner","lease_token"
     FROM "_damat_job_runs" WHERE "status"='running'
       AND "lease_expires_at" <= NOW()
       AND ($2::text IS NULL OR "queue"=$2)
     ORDER BY "lease_expires_at","id" FOR UPDATE SKIP LOCKED LIMIT $1`,
    [limit, queue ?? null],
  );
  for (const row of result.rows) await recoverExpiredJobLease(executor, row);
  return result.rows.length;
}
