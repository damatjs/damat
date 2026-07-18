import type { DurabilityExecutor } from "@damatjs/durability";
import type { PipelineEdge } from "../definitions";
import {
  createNodeExecution,
  type NodeExecutionRow,
  type RunRow,
} from "../repositories";
import { evaluatePipelineExpression, evaluatePipelineValue } from "../runtime";
import { loadEvaluationContext } from "../runtime/context";

export async function scheduleOutgoing(
  executor: DurabilityExecutor,
  run: RunRow,
  source: NodeExecutionRow,
  outcome: "success" | "failure",
  sourceOutput?: unknown,
): Promise<number> {
  const context = await loadEvaluationContext(executor, run);
  const edges = run.manifest.edges.filter((edge) =>
    eligible(edge, source.node_id, outcome),
  );
  let created = 0;
  for (const edge of edges) {
    if (edge.when && !evaluatePipelineExpression(edge.when, context)) continue;
    const target = run.manifest.nodes.find((node) => node.id === edge.to)!;
    const value = evaluatePipelineValue(edge.input ?? target.input, context);
    const id = await createNodeExecution(executor, {
      runId: run.id,
      nodeId: target.id,
      kind: target.kind,
      value: value === undefined ? (sourceOutput ?? source.output) : value,
    });
    if (!id) continue;
    await executor.query(
      `INSERT INTO "_damat_pipeline_transitions"
        ("run_id","from_execution_id","to_execution_id","edge","reason")
       VALUES ($1,$2,$3,$4::jsonb,$5)
       ON CONFLICT ("run_id","from_execution_id","to_execution_id") DO NOTHING`,
      [run.id, source.id, id, JSON.stringify(edge), outcome],
    );
    created++;
  }
  if (created)
    await executor.query(
      `UPDATE "_damat_pipeline_runs" SET "status"='running',"updated_at"=NOW() WHERE "id"=$1`,
      [run.id],
    );
  return created;
}

function eligible(
  edge: PipelineEdge,
  nodeId: string,
  outcome: "success" | "failure",
): boolean {
  if (edge.from !== nodeId) return false;
  return edge.on === "always" || (edge.on ?? "success") === outcome;
}
