import type { DurabilityExecutor } from "@damatjs/durability";
import type { PipelineLoopNode } from "../definitions";
import type { NodeExecutionRow, RunRow } from "../repositories";
import { evaluatePipelineExpression } from "../runtime";
import { loadEvaluationContext } from "../runtime/context";
import type { ChildRunRow } from "./child-rows";
import { startChildRun } from "./child-start";
import { completeForwardNode, failForwardNode } from "./outcome";
import { waitNode } from "./update";

export async function processLoop(
  executor: DurabilityExecutor,
  run: RunRow,
  execution: NodeExecutionRow,
  node: PipelineLoopNode,
): Promise<void> {
  const children = await childRuns(executor, execution.id);
  if (!children.length) {
    await startChildRun(
      executor,
      run,
      execution,
      node.pipeline,
      execution.input,
      "iteration:0",
    );
    await waitNode(executor, execution);
    return;
  }
  const latest = children.at(-1)!;
  if (!latest.completed_at) return;
  if (latest.status !== "succeeded") {
    await failForwardNode(executor, run, execution, node, {
      name: "LoopChildFailed",
      message: `Loop child ended as ${latest.status}`,
    });
    return;
  }
  const context = await loadEvaluationContext(executor, run, {
    item: latest.output,
    iteration: children.length,
  });
  if (evaluatePipelineExpression(node.until, context)) {
    await completeForwardNode(executor, run, execution, latest.output);
    return;
  }
  if (children.length >= node.maxIterations) {
    await failForwardNode(executor, run, execution, node, {
      name: "LoopLimitExceeded",
      message: `Loop reached ${node.maxIterations} iterations`,
    });
    return;
  }
  await startChildRun(
    executor,
    run,
    execution,
    node.pipeline,
    latest.output,
    `iteration:${children.length}`,
  );
}

function childRuns(executor: DurabilityExecutor, executionId: string) {
  return executor
    .query<ChildRunRow>(
      `SELECT "id","status","input","output","error","completed_at","created_at"
     FROM "_damat_pipeline_runs" WHERE "parent_node_execution_id"=$1
     ORDER BY split_part("trigger"->>'activation',':',2)::int,"id"`,
      [executionId],
    )
    .then((result) => result.rows);
}
