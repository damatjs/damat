import type { DurabilityExecutor } from "@damatjs/durability";
import type { NodeExecutionRow } from "../repositories";

export interface TerminalJobExecution extends NodeExecutionRow {
  job_status: "succeeded" | "dead_lettered" | "cancelled";
  job_result: unknown;
  job_error: Record<string, unknown> | null;
}

export async function claimTerminalJobExecutions(
  executor: DurabilityExecutor,
  limit: number,
): Promise<TerminalJobExecution[]> {
  const result = await executor.query<TerminalJobExecution>(
    `SELECT n.*,j."status" AS "job_status",j."result" AS "job_result",
       j."last_error" AS "job_error"
     FROM "_damat_pipeline_node_executions" n
     JOIN "_damat_job_runs" j ON j."id"=n."job_run_id"
     JOIN "_damat_pipeline_runs" r ON r."id"=n."run_id"
     WHERE n."status" IN ('queued','running')
       AND j."status" IN ('succeeded','dead_lettered','cancelled')
       AND r."status" NOT IN ('succeeded','failed','cancelled','compensated','compensation_failed')
     ORDER BY j."completed_at",n."id"
     FOR UPDATE OF r,n SKIP LOCKED LIMIT $1`,
    [limit],
  );
  return result.rows;
}

export async function claimRoutableNodes(
  executor: DurabilityExecutor,
  limit: number,
): Promise<NodeExecutionRow[]> {
  const result = await executor.query<NodeExecutionRow>(
    `SELECT n.* FROM "_damat_pipeline_node_executions" n
     JOIN "_damat_pipeline_runs" r ON r."id"=n."run_id"
     WHERE n."status" IN ('ready','waiting')
       AND r."status" IN ('running','waiting','compensating')
       AND (n."kind"<>'delay' OR n."available_at"<=NOW())
     ORDER BY n."available_at",n."created_at",n."id"
     FOR UPDATE OF r,n SKIP LOCKED LIMIT $1`,
    [limit],
  );
  return result.rows;
}
