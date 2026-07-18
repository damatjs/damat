import type { DurabilityExecutor } from "@damatjs/durability";
import type { PipelineControlNode } from "../definitions";
import type { NodeExecutionRow, RunRow } from "../repositories";
import { completeForwardNode } from "./outcome";
import { waitNode } from "./update";

export async function processJoin(
  executor: DurabilityExecutor,
  run: RunRow,
  execution: NodeExecutionRow,
  node: PipelineControlNode,
): Promise<void> {
  if (execution.status === "ready") await waitNode(executor, execution);
  const incoming = run.manifest.edges.filter((edge) => edge.to === node.id);
  const result = await executor.query<{ count: string }>(
    `SELECT COUNT(DISTINCT "from_execution_id")::text AS "count"
     FROM "_damat_pipeline_transitions" WHERE "to_execution_id"=$1`,
    [execution.id],
  );
  const count = Number(result.rows[0]?.count ?? 0);
  const ready =
    (node.join ?? "all") === "any" ? count > 0 : count >= incoming.length;
  if (ready)
    await completeForwardNode(executor, run, execution, { joined: count });
}
