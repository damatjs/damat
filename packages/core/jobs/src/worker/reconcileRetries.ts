import {
  getDurabilityClient,
  type DurabilityExecutor,
} from "@damatjs/durability";
import { appendJobActivity } from "../repositories";
import { reconcileLimit, type ReconcileOptions } from "./reconcile-options";

interface RetryRow {
  id: string;
}

export async function reconcileJobRetries(
  options: ReconcileOptions = {},
): Promise<number> {
  const limit = reconcileLimit(options.limit);
  if (options.executor) return promote(options.executor, limit, options.queue);
  return getDurabilityClient().transaction((executor) =>
    promote(executor, limit, options.queue),
  );
}

async function promote(
  executor: DurabilityExecutor,
  limit: number,
  queue?: string,
): Promise<number> {
  const selected = await executor.query<RetryRow>(
    `SELECT "id" FROM "_damat_job_runs" WHERE "status"='retry_wait'
       AND "available_at" <= NOW() AND ($2::text IS NULL OR "queue"=$2)
     ORDER BY "available_at","id"
     FOR UPDATE SKIP LOCKED LIMIT $1`,
    [limit, queue ?? null],
  );
  for (const row of selected.rows) {
    await executor.query(
      `UPDATE "_damat_job_runs" SET "status"='queued',"updated_at"=NOW()
       WHERE "id"=$1 AND "status"='retry_wait'`,
      [row.id],
    );
    await appendJobActivity(executor, {
      runId: row.id,
      type: "retry_ready",
      previousStatus: "retry_wait",
      nextStatus: "queued",
    });
  }
  return selected.rows.length;
}
