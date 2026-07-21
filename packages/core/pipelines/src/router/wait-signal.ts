import type { DurabilityExecutor } from "@damatjs/durability";
import type { PipelineSignalNode } from "../definitions";
import type { NodeExecutionRow, RunRow } from "../repositories";
import { completeForwardNode } from "./outcome";
import { waitNode } from "./update";

export async function processSignalWait(
  executor: DurabilityExecutor,
  run: RunRow,
  execution: NodeExecutionRow,
  node: PipelineSignalNode,
): Promise<void> {
  const result = await executor.query<{ id: string; payload: unknown }>(
    `SELECT "id","payload" FROM "_damat_pipeline_signals"
     WHERE "run_id"=$1 AND "name"=$2 AND "consumed_at" IS NULL
     ORDER BY "created_at","id" FOR UPDATE SKIP LOCKED LIMIT 1`,
    [run.id, node.signal],
  );
  const signal = result.rows[0];
  if (!signal) {
    await waitNode(executor, execution);
    return;
  }
  await executor.query(
    `UPDATE "_damat_pipeline_signals" SET "consumed_by"=$2,"consumed_at"=NOW()
     WHERE "id"=$1`,
    [signal.id, execution.id],
  );
  await completeForwardNode(executor, run, execution, signal.payload);
}
