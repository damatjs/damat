import type { DurabilityExecutor } from "@damatjs/durability";
import {
  createNodeExecution,
  markPipelineRunTerminal,
  type NodeExecutionRow,
  type RunRow,
} from "../repositories";
import { evaluatePipelineValue } from "../runtime";
import { loadEvaluationContext } from "../runtime/context";

export async function scheduleNextCompensation(
  executor: DurabilityExecutor,
  run: RunRow,
  terminalError: Record<string, unknown> | undefined = run.error ?? undefined,
): Promise<string | undefined> {
  const completed = await executor.query<NodeExecutionRow>(
    `SELECT * FROM "_damat_pipeline_node_executions"
     WHERE "run_id"=$1 AND "phase"='forward' AND "status"='succeeded'
     ORDER BY "completed_at" DESC,"id" DESC`,
    [run.id],
  );
  const existing = await executor.query<{ node_id: string }>(
    `SELECT "node_id" FROM "_damat_pipeline_node_executions"
     WHERE "run_id"=$1 AND "phase"='compensation'`,
    [run.id],
  );
  const seen = new Set(existing.rows.map((row) => row.node_id));
  const forward = completed.rows.find((row) => {
    const node = run.manifest.nodes.find((value) => value.id === row.node_id);
    return Boolean(node?.compensateWith) && !seen.has(row.node_id);
  });
  if (!forward) {
    await markPipelineRunTerminal(
      executor,
      run.id,
      "compensated",
      undefined,
      terminalError,
    );
    return undefined;
  }
  const node = run.manifest.nodes.find(
    (value) => value.id === forward.node_id,
  )!;
  const context = await loadEvaluationContext(executor, run);
  return createNodeExecution(executor, {
    runId: run.id,
    nodeId: node.id,
    kind: node.compensateWith!.kind,
    value:
      evaluatePipelineValue(node.compensateWith!.input, context) ??
      forward.output,
    phase: "compensation",
  });
}
