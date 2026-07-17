import type {
  DurabilityExecutor,
  WorkSummaryFilter,
} from "@damatjs/durability";
import type { EventDurationDistribution } from "./summary-types";

export async function queryEventWaitingDurations(
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
    `WITH waits AS (SELECT "wait_ms" AS value
     FROM "_damat_event_delivery_attempts" WHERE "started_at">=$1
       AND "started_at"<$2 AND "wait_ms" IS NOT NULL)
     SELECT COUNT(*)::text AS "count",MIN(value)::text AS "min",
       percentile_cont(0.5) WITHIN GROUP (ORDER BY value)::text AS "p50",
       percentile_cont(0.95) WITHIN GROUP (ORDER BY value)::text AS "p95",
       percentile_cont(0.99) WITHIN GROUP (ORDER BY value)::text AS "p99",
       MAX(value)::text AS "max" FROM waits`,
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
