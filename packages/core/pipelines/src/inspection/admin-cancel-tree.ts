import type { DurabilityExecutor } from "@damatjs/durability";
import type { QueryResultRow } from "@damatjs/deps/pg";

export interface ActivePipelineTreeRow extends QueryResultRow {
  id: string;
  status: string;
  depth: number;
}

export async function lockActivePipelineTree(
  executor: DurabilityExecutor,
  runId: string,
): Promise<ActivePipelineTreeRow[]> {
  const result = await executor.query<ActivePipelineTreeRow>(
    `WITH RECURSIVE tree AS (
       SELECT "id",0 AS "depth" FROM "_damat_pipeline_runs" WHERE "id"=$1
       UNION ALL
       SELECT child."id",tree."depth"+1
       FROM "_damat_pipeline_runs" child JOIN tree
         ON child."parent_run_id"=tree."id"
     ) SELECT run."id",run."status",tree."depth"
       FROM "_damat_pipeline_runs" run JOIN tree ON tree."id"=run."id"
       WHERE run."completed_at" IS NULL
       ORDER BY tree."depth" DESC,run."id" FOR UPDATE OF run`,
    [runId],
  );
  return result.rows;
}
