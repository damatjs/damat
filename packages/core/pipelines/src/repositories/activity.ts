import type { DurabilityExecutor, WorkActor } from "@damatjs/durability";

export function appendPipelineActivity(
  executor: DurabilityExecutor,
  input: {
    runId?: string;
    nodeExecutionId?: string;
    type: string;
    details?: Record<string, unknown>;
    actor?: WorkActor;
  },
): Promise<unknown> {
  return executor.query(
    `INSERT INTO "_damat_pipeline_activity"
      ("run_id","node_execution_id","type","details","actor")
     VALUES ($1,$2,$3,$4::jsonb,$5::jsonb)`,
    [
      input.runId ?? null,
      input.nodeExecutionId ?? null,
      input.type,
      JSON.stringify(input.details ?? {}),
      JSON.stringify(input.actor ?? {}),
    ],
  );
}
