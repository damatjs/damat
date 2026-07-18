import type { DurabilityExecutor } from "@damatjs/durability";
import type { PipelineRunStatus } from "./rows";
import { recordPipelineSignal } from "./signal";

type TerminalStatus = Extract<
  PipelineRunStatus,
  "succeeded" | "failed" | "cancelled" | "compensated" | "compensation_failed"
>;

export async function markPipelineRunTerminal(
  executor: DurabilityExecutor,
  runId: string,
  status: TerminalStatus,
  output?: unknown,
  error?: Record<string, unknown>,
): Promise<void> {
  const result = await executor.query<{ parent_run_id: string | null }>(
    `UPDATE "_damat_pipeline_runs" SET "status"=$2,
       "output"=$3::jsonb,"error"=$4::jsonb,"completed_at"=NOW(),
       "retention_at"=CASE WHEN "retention_ms" IS NULL THEN NULL
         ELSE NOW()+("retention_ms"*INTERVAL '1 ms') END,"updated_at"=NOW()
     WHERE "id"=$1 RETURNING "parent_run_id"`,
    [
      runId,
      status,
      output === undefined ? null : JSON.stringify(output),
      error ? JSON.stringify(error) : null,
    ],
  );
  await recordPipelineSignal(executor, runId, "remove");
  const parentId = result.rows[0]?.parent_run_id;
  if (parentId) await recordPipelineSignal(executor, parentId);
}
