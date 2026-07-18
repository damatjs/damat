import type { DurabilityExecutor } from "@damatjs/durability";
import type { QueryResultRow } from "@damatjs/deps/pg";
import { recordPipelineSignal } from "../repositories";
import type {
  PipelineRetentionOptions,
  PipelineRetentionResult,
} from "./types";

interface DoomedRow extends QueryResultRow {
  id: string;
  run_ids: string[];
  job_ids: string[];
}

export async function retainPipelineRuns(
  executor: DurabilityExecutor,
  terminalBefore: Date | null,
  limit: number,
  actor: PipelineRetentionOptions["actor"],
  reason = "scheduled retention",
): Promise<PipelineRetentionResult> {
  const doomed = await selectDoomed(executor, terminalBefore, limit);
  const rootIds = doomed.map((row) => row.id);
  const runIds = doomed.flatMap((row) => row.run_ids);
  const jobIds = doomed.flatMap((row) => row.job_ids);
  for (const rootId of rootIds)
    await recordPipelineSignal(executor, rootId, "remove");
  if (rootIds.length)
    await executor.query(
      `DELETE FROM "_damat_pipeline_runs" WHERE "id"=ANY($1::uuid[])`,
      [rootIds],
    );
  const deletedJobs = await deleteJobs(executor, jobIds);
  const result = { deletedRuns: runIds.length, deletedJobs };
  await executor.query(
    `INSERT INTO "_damat_maintenance_activity"
      ("operation","work_kind","scope","status","actor","details","completed_at")
     VALUES ('pipeline_retention','pipeline','*','completed',$1::jsonb,$2::jsonb,NOW())`,
    [JSON.stringify(actor), JSON.stringify({ ...result, reason })],
  );
  return result;
}

function selectDoomed(
  executor: DurabilityExecutor,
  terminalBefore: Date | null,
  limit: number,
) {
  return executor
    .query<DoomedRow>(
      `WITH RECURSIVE lineage AS (
         SELECT r."id" AS "root_id",r."id",r."retention_at",r."completed_at"
         FROM "_damat_pipeline_runs" r WHERE r."parent_run_id" IS NULL
         UNION ALL SELECT l."root_id",c."id",c."retention_at",c."completed_at"
         FROM "_damat_pipeline_runs" c JOIN lineage l ON c."parent_run_id"=l."id"
       ), candidates AS (
         SELECT r."id",r."completed_at" FROM "_damat_pipeline_runs" r
         WHERE r."parent_run_id" IS NULL AND r."completed_at" IS NOT NULL
           AND NOT EXISTS (SELECT 1 FROM lineage l WHERE l."root_id"=r."id"
             AND (l."completed_at" IS NULL OR l."retention_at" IS NULL
               OR l."retention_at">COALESCE($1,NOW())))
         ORDER BY r."completed_at",r."id" FOR UPDATE SKIP LOCKED LIMIT $2
       ), doomed_runs AS (
         SELECT c."id" AS "root_id",l."id",c."completed_at"
         FROM candidates c JOIN lineage l ON l."root_id"=c."id"
       ) SELECT d."root_id" AS "id",array_agg(DISTINCT d."id") AS "run_ids",
         COALESCE(array_agg(DISTINCT n."job_run_id") FILTER
           (WHERE n."job_run_id" IS NOT NULL),'{}') AS "job_ids"
       FROM doomed_runs d LEFT JOIN "_damat_pipeline_node_executions" n
         ON n."run_id"=d."id" GROUP BY d."root_id",d."completed_at"
       ORDER BY d."completed_at",d."root_id"`,
      [terminalBefore, limit],
    )
    .then((result) => result.rows);
}

async function deleteJobs(executor: DurabilityExecutor, ids: string[]) {
  if (!ids.length) return 0;
  const result = await executor.query(
    `DELETE FROM "_damat_job_runs" WHERE "id"=ANY($1::uuid[])`,
    [ids],
  );
  return result.rowCount ?? 0;
}
