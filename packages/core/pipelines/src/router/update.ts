import type { DurabilityExecutor } from "@damatjs/durability";
import {
  appendPipelineActivity,
  markPipelineRunTerminal,
  recordPipelineSignal,
  type NodeExecutionRow,
} from "../repositories";

export async function finishNode(
  executor: DurabilityExecutor,
  node: NodeExecutionRow,
  status:
    | "succeeded"
    | "failed"
    | "cancelled"
    | "compensated"
    | "compensation_failed",
  output?: unknown,
  error?: Record<string, unknown>,
): Promise<void> {
  await executor.query(
    `UPDATE "_damat_pipeline_node_executions" SET "status"=$2,
       "output"=$3::jsonb,"error"=$4::jsonb,"completed_at"=NOW(),"updated_at"=NOW()
     WHERE "id"=$1`,
    [
      node.id,
      status,
      output === undefined ? null : JSON.stringify(output),
      error ? JSON.stringify(error) : null,
    ],
  );
  await appendPipelineActivity(executor, {
    runId: node.run_id,
    nodeExecutionId: node.id,
    type: `node.${status}`,
    details: error ? { error } : {},
  });
  await recordPipelineSignal(executor, node.run_id, "remove");
}

export async function waitNode(
  executor: DurabilityExecutor,
  node: NodeExecutionRow,
  availableAt?: Date,
): Promise<void> {
  if (node.status === "waiting" && availableAt === undefined) return;
  await executor.query(
    `UPDATE "_damat_pipeline_node_executions" SET "status"='waiting',
       "available_at"=COALESCE($2,"available_at"),"updated_at"=NOW() WHERE "id"=$1`,
    [node.id, availableAt ?? null],
  );
  await recordPipelineSignal(executor, node.run_id, "upsert", availableAt);
  await executor.query(
    `UPDATE "_damat_pipeline_runs" SET "status"='waiting',"updated_at"=NOW()
     WHERE "id"=$1 AND "status"='running'`,
    [node.run_id],
  );
}

export async function failRun(
  executor: DurabilityExecutor,
  runId: string,
  error: Record<string, unknown>,
): Promise<void> {
  await markPipelineRunTerminal(executor, runId, "failed", undefined, error);
}
