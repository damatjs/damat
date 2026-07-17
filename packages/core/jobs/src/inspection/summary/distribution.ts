import type { QueryResultRow } from "@damatjs/deps/pg";
import type { DurabilityExecutor } from "@damatjs/durability";
import type { DurationDistribution } from "../types";

interface DistributionRow extends QueryResultRow {
  count: string;
  average_ms: number;
  p50_ms: number;
  p95_ms: number;
  max_ms: string;
}

export async function readDistribution(
  executor: DurabilityExecutor,
  expression: "processing" | "waiting",
  from: Date,
  to: Date,
): Promise<DurationDistribution> {
  const source =
    expression === "processing"
      ? `SELECT "duration_ms"::float8 AS value FROM "_damat_job_attempts"
         WHERE "finished_at">=$1 AND "finished_at"<$2 AND "duration_ms" IS NOT NULL`
      : `SELECT "wait_ms"::float8 AS value FROM "_damat_job_attempts"
         WHERE "started_at">=$1 AND "started_at"<$2 AND "wait_ms" IS NOT NULL`;
  const result = await executor.query<DistributionRow>(
    `SELECT COUNT(*)::text AS count,COALESCE(AVG(value),0)::float8 AS average_ms,
       COALESCE(percentile_cont(0.5) WITHIN GROUP (ORDER BY value),0)::float8
         AS p50_ms,
       COALESCE(percentile_cont(0.95) WITHIN GROUP (ORDER BY value),0)::float8
         AS p95_ms,COALESCE(MAX(value),0)::text AS max_ms FROM (${source}) d`,
    [from, to],
  );
  const row = result.rows[0]!;
  return {
    count: +row.count,
    averageMs: row.average_ms,
    p50Ms: row.p50_ms,
    p95Ms: row.p95_ms,
    maxMs: +row.max_ms,
  };
}
