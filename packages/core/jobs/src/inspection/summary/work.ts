import type { QueryResultRow } from "@damatjs/deps/pg";
import type { DurabilityExecutor } from "@damatjs/durability";
import type { JobFailureGroup } from "../types";

interface WorkRow extends QueryResultRow {
  oldest_wait_ms: string | null;
  next_work_at: Date | null;
  active_leases: string;
  stale_leases: string;
  dead_letters: string;
}

export async function readWorkState(executor: DurabilityExecutor, now: Date) {
  const result = await executor.query<WorkRow>(
    `SELECT
       MAX(GREATEST(0,EXTRACT(EPOCH FROM ($1::timestamptz-"available_at"))*1000))
         FILTER (WHERE "status" IN ('queued','retry_wait')
           AND "available_at"<=$1)::text oldest_wait_ms,
       MIN("available_at") FILTER (WHERE "status" IN ('queued','retry_wait')) next_work_at,
       COUNT(*) FILTER (WHERE "status"='running' AND "lease_expires_at">$1)::text active_leases,
       COUNT(*) FILTER (WHERE "status"='running' AND "lease_expires_at"<=$1)::text stale_leases,
       COUNT(*) FILTER (WHERE "status"='dead_lettered')::text dead_letters
     FROM "_damat_job_runs"`,
    [now],
  );
  const row = result.rows[0]!;
  return {
    ...(row.oldest_wait_ms !== null
      ? { oldestWaitMs: +row.oldest_wait_ms }
      : {}),
    ...(row.next_work_at ? { nextWorkAt: row.next_work_at } : {}),
    leases: { active: +row.active_leases, stale: +row.stale_leases },
    deadLetterTotal: +row.dead_letters,
  };
}

export async function readFailureGroups(
  executor: DurabilityExecutor,
  from: Date,
  to: Date,
): Promise<JobFailureGroup[]> {
  const result = await executor.query<
    QueryResultRow & {
      queue: string;
      name: string;
      message: string;
      count: string;
    }
  >(
    `SELECT "queue","name",COALESCE("last_error"->>'message','Unknown') message,
       COUNT(*)::text count FROM "_damat_job_runs"
     WHERE "status"='dead_lettered' AND "completed_at">=$1 AND "completed_at"<$2
     GROUP BY "queue","name",message ORDER BY COUNT(*) DESC,"queue","name" LIMIT 20`,
    [from, to],
  );
  return result.rows.map((row) => ({ ...row, count: +row.count }));
}
