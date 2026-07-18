import type { DurabilityExecutor } from "@damatjs/durability";
import type { PipelineEvaluationContext } from "./evaluation-context";
import type { NodeExecutionRow, RunRow } from "../repositories";

export async function loadEvaluationContext(
  executor: DurabilityExecutor,
  run: RunRow,
  extra: Partial<PipelineEvaluationContext> = {},
): Promise<PipelineEvaluationContext> {
  const result = await executor.query<NodeExecutionRow>(
    `SELECT * FROM "_damat_pipeline_node_executions"
     WHERE "run_id"=$1 AND "phase"='forward'`,
    [run.id],
  );
  const nodes = Object.fromEntries(
    result.rows.map((node) => [
      node.node_id,
      {
        ...(node.input !== null ? { input: node.input } : {}),
        ...(node.output !== null ? { output: node.output } : {}),
        ...(node.error ? { error: node.error } : {}),
      },
    ]),
  );
  return { input: run.input, trigger: run.trigger, nodes, ...extra };
}
