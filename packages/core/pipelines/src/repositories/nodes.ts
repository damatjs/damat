import type { DurabilityExecutor } from "@damatjs/durability";
import { mapNodeExecution } from "./mappers";
import type { NodeExecutionRow } from "./node-rows";
import { pipelineExecutor } from "./query";
import { recordPipelineSignal } from "./signal";

export async function listPipelineNodeExecutions(
  runId: string,
  executor?: DurabilityExecutor,
) {
  const result = await pipelineExecutor(executor).query<NodeExecutionRow>(
    `SELECT * FROM "_damat_pipeline_node_executions"
     WHERE "run_id"=$1 ORDER BY "created_at","id"`,
    [runId],
  );
  return result.rows.map(mapNodeExecution);
}

export async function findNodeExecution(
  id: string,
  executor?: DurabilityExecutor,
) {
  const result = await pipelineExecutor(executor).query<NodeExecutionRow>(
    `SELECT * FROM "_damat_pipeline_node_executions" WHERE "id"=$1`,
    [id],
  );
  return result.rows[0] ? mapNodeExecution(result.rows[0]) : undefined;
}

export async function createNodeExecution(
  executor: DurabilityExecutor,
  input: {
    runId: string;
    nodeId: string;
    kind: string;
    value?: unknown;
    activationKey?: string;
    phase?: "forward" | "compensation";
    availableAt?: Date;
  },
): Promise<string | undefined> {
  const id = crypto.randomUUID();
  const result = await executor.query<{ id: string }>(
    `INSERT INTO "_damat_pipeline_node_executions"
      ("id","run_id","node_id","kind","input","activation_key","phase","status","available_at")
     VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7,'ready',$8)
     ON CONFLICT ("run_id","node_id","activation_key","phase")
       DO UPDATE SET "node_id"=EXCLUDED."node_id"
     RETURNING "id"`,
    [
      id,
      input.runId,
      input.nodeId,
      input.kind,
      JSON.stringify(input.value ?? null),
      input.activationKey ?? "main",
      input.phase ?? "forward",
      input.availableAt ?? new Date(),
    ],
  );
  await recordPipelineSignal(
    executor,
    input.runId,
    "upsert",
    input.availableAt,
  );
  return result.rows[0]?.id;
}
