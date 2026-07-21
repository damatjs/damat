import type { QueryResultRow } from "@damatjs/deps/pg";
import type { ResolvedPipelineInspectionOptions } from "./config";
import type { PipelineOperationalSummary } from "./types";

interface CountRow extends QueryResultRow {
  value: string;
  count: string;
}
interface DurationRow extends QueryResultRow {
  average: string | null;
}

export async function getPipelineOperationalSummary(
  options: ResolvedPipelineInspectionOptions,
): Promise<PipelineOperationalSummary> {
  const [runs, nodes, duration] = await Promise.all([
    options.client.query<CountRow>(
      `SELECT "status" AS "value",COUNT(*)::text AS "count"
       FROM "_damat_pipeline_runs" GROUP BY "status"`,
    ),
    options.client.query<CountRow>(
      `SELECT "status" AS "value",COUNT(*)::text AS "count"
       FROM "_damat_pipeline_node_executions" GROUP BY "status"`,
    ),
    options.client.query<DurationRow>(
      `SELECT AVG(EXTRACT(EPOCH FROM ("completed_at"-"started_at"))*1000)::text AS "average"
       FROM "_damat_pipeline_runs" WHERE "completed_at" IS NOT NULL`,
    ),
  ]);
  const average = duration.rows[0]?.average;
  return {
    statuses: Object.fromEntries(
      runs.rows.map((row) => [row.value, Number(row.count)]),
    ),
    nodeStatuses: Object.fromEntries(
      nodes.rows.map((row) => [row.value, Number(row.count)]),
    ),
    ...(average !== null && average !== undefined
      ? { averageDurationMs: Number(average) }
      : {}),
  };
}
