import type {
  DurabilityExecutor,
  WorkSummaryFilter,
} from "@damatjs/durability";
import type {
  EventDeadLetterGroup,
  EventDurationDistribution,
} from "./summary-types";

export async function queryEventActivityCounts(
  executor: DurabilityExecutor,
  filter: WorkSummaryFilter,
): Promise<Record<string, number>> {
  const result = await executor.query<{ type: string; total: string }>(
    `SELECT "type",COUNT(*)::text AS "total" FROM "_damat_event_activity"
     WHERE "occurred_at">=$1 AND "occurred_at"<$2 GROUP BY "type"`,
    [filter.from, filter.to],
  );
  return Object.fromEntries(result.rows.map((row) => [row.type, +row.total]));
}

export async function queryEventDurations(
  executor: DurabilityExecutor,
  filter: WorkSummaryFilter,
): Promise<EventDurationDistribution> {
  const result = await executor.query<{
    count: string;
    min: string | null;
    p50: string | null;
    p95: string | null;
    p99: string | null;
    max: string | null;
  }>(
    `SELECT COUNT(*)::text AS "count",MIN("duration_ms")::text AS "min",
      percentile_cont(0.5) WITHIN GROUP (ORDER BY "duration_ms")::text AS "p50",
      percentile_cont(0.95) WITHIN GROUP (ORDER BY "duration_ms")::text AS "p95",
      percentile_cont(0.99) WITHIN GROUP (ORDER BY "duration_ms")::text AS "p99",
      MAX("duration_ms")::text AS "max" FROM "_damat_event_delivery_attempts"
     WHERE "finished_at">=$1 AND "finished_at"<$2`,
    [filter.from, filter.to],
  );
  const row = result.rows[0]!;
  return {
    count: +row.count,
    ...Object.fromEntries(
      ["min", "p50", "p95", "p99", "max"].flatMap((key) => {
        const value = row[key as keyof typeof row];
        return value === null ? [] : [[key, Number(value)]];
      }),
    ),
  };
}

export async function queryEventDeadLetters(
  executor: DurabilityExecutor,
  filter: WorkSummaryFilter,
): Promise<EventDeadLetterGroup[]> {
  const result = await executor.query<{
    event: string;
    consumer: string;
    total: string;
    last_failed_at: Date | null;
  }>(
    `SELECT o."name" AS "event",d."consumer",COUNT(*)::text AS "total",
       MAX(d."completed_at") AS "last_failed_at" FROM "_damat_event_deliveries" d
     JOIN "_damat_event_outbox" o ON o."id"=d."event_id"
     WHERE d."status"='dead_lettered' AND d."completed_at">=$1
       AND d."completed_at"<$2 GROUP BY o."name",d."consumer"
     ORDER BY COUNT(*) DESC,o."name",d."consumer" LIMIT 20`,
    [filter.from, filter.to],
  );
  return result.rows.map((row) => ({
    event: row.event,
    consumer: row.consumer,
    count: +row.total,
    ...(row.last_failed_at ? { lastFailedAt: row.last_failed_at } : {}),
  }));
}
