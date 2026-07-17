import type { QueryResultRow } from "@damatjs/deps/pg";
import type { DurabilityExecutor } from "@damatjs/durability";
import type { JobThroughputBucket } from "../types";

interface ThroughputRow extends QueryResultRow {
  bucket_start: Date;
  queue: string;
  name: string;
  succeeded: string;
  failed: string;
  cancelled: string;
}

export async function readThroughput(
  executor: DurabilityExecutor,
  from: Date,
  to: Date,
  intervalMs: number,
): Promise<JobThroughputBucket[]> {
  const result = await executor.query<ThroughputRow>(
    `SELECT date_bin(($3::bigint*INTERVAL '1 ms'),"completed_at",
       TIMESTAMPTZ '1970-01-01') AS bucket_start,"queue","name",
       COUNT(*) FILTER (WHERE "status"='succeeded')::text AS succeeded,
       COUNT(*) FILTER (WHERE "status"='dead_lettered')::text AS failed,
       COUNT(*) FILTER (WHERE "status"='cancelled')::text AS cancelled
     FROM "_damat_job_runs" WHERE "completed_at">=$1 AND "completed_at"<$2
     GROUP BY bucket_start,"queue","name"
     ORDER BY bucket_start,"queue","name"`,
    [from, to, intervalMs],
  );
  return result.rows.map((row) => ({
    bucketStart: row.bucket_start,
    queue: row.queue,
    name: row.name,
    succeeded: +row.succeeded,
    failed: +row.failed,
    cancelled: +row.cancelled,
  }));
}
