import type { QueryResultRow } from "@damatjs/deps/pg";
import type { DurabilityExecutor } from "@damatjs/durability";
import type { JobRunStatus } from "../../repositories";

interface CountRow extends QueryResultRow {
  key: string;
  count: string;
}

export async function readStatusCounts(
  executor: DurabilityExecutor,
): Promise<Record<JobRunStatus, number>> {
  const result = await executor.query<CountRow>(
    `SELECT "status" AS key,COUNT(*)::text AS count FROM "_damat_job_runs"
     GROUP BY "status"`,
  );
  const counts: Record<JobRunStatus, number> = {
    queued: 0,
    running: 0,
    retry_wait: 0,
    succeeded: 0,
    dead_lettered: 0,
    cancelled: 0,
  };
  for (const row of result.rows) counts[row.key as JobRunStatus] = +row.count;
  return counts;
}

export async function readActivityCounts(
  executor: DurabilityExecutor,
  from: Date,
  to: Date,
): Promise<Record<string, number>> {
  const result = await executor.query<CountRow>(
    `SELECT "type" AS key,COUNT(*)::text AS count FROM "_damat_job_activity"
     WHERE "occurred_at">=$1 AND "occurred_at"<$2 GROUP BY "type"`,
    [from, to],
  );
  return Object.fromEntries(result.rows.map((row) => [row.key, +row.count]));
}
