import type {
  DurabilityExecutor,
  WorkSummaryFilter,
} from "@damatjs/durability";
import type { EventThroughputBucket } from "./summary-types";

interface ThroughputRow {
  bucket_start: Date;
  event: string;
  consumer: string | null;
  total: string;
  succeeded: string;
  failed: string;
  retried: string;
  cancelled: string;
  recovered: string;
}

export async function queryEventThroughput(
  executor: DurabilityExecutor,
  filter: WorkSummaryFilter,
): Promise<EventThroughputBucket[]> {
  const result = await executor.query<ThroughputRow>(
    `SELECT to_timestamp(FLOOR(EXTRACT(EPOCH FROM a."occurred_at")*1000/$3)
       *$3/1000) AS "bucket_start",o."name" AS "event",a."consumer",
       COUNT(*)::text AS "total",
       COUNT(*) FILTER (WHERE a."type"='succeeded')::text AS "succeeded",
       COUNT(*) FILTER (WHERE a."type"='dead_lettered')::text AS "failed",
       COUNT(*) FILTER (WHERE a."type"='retry_wait')::text AS "retried",
       COUNT(*) FILTER (WHERE a."type"='cancelled')::text AS "cancelled",
       COUNT(*) FILTER (WHERE a."type"='lease_recovered')::text AS "recovered"
     FROM "_damat_event_activity" a JOIN "_damat_event_outbox" o
       ON o."id"=a."event_id" WHERE a."occurred_at">=$1 AND a."occurred_at"<$2
       AND a."type" IN
         ('succeeded','dead_lettered','retry_wait','cancelled','lease_recovered')
     GROUP BY "bucket_start",o."name",a."consumer"
     ORDER BY "bucket_start",o."name",a."consumer"`,
    [filter.from, filter.to, filter.intervalMs],
  );
  return result.rows.map((row) => ({
    bucketStart: row.bucket_start,
    event: row.event,
    ...(row.consumer ? { consumer: row.consumer } : {}),
    total: +row.total,
    succeeded: +row.succeeded,
    failed: +row.failed,
    retried: +row.retried,
    cancelled: +row.cancelled,
    recovered: +row.recovered,
  }));
}
