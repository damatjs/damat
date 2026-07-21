import type { DurabilityExecutor } from "@damatjs/durability";
import type { PipelineChildNode } from "../definitions";
import {
  findPipelineRun,
  type NodeExecutionRow,
  type RunRow,
} from "../repositories";
import { evaluatePipelineValue } from "../runtime";
import { loadEvaluationContext } from "../runtime/context";
import { startChildRun } from "./child-start";
import { completeForwardNode, failForwardNode } from "./outcome";
import { waitNode } from "./update";

export async function processChild(
  executor: DurabilityExecutor,
  run: RunRow,
  execution: NodeExecutionRow,
  node: PipelineChildNode,
): Promise<void> {
  if (execution.status === "ready") {
    const context = await loadEvaluationContext(executor, run);
    const input = evaluatePipelineValue(node.input, context) ?? execution.input;
    const child = await startChildRun(
      executor,
      run,
      execution,
      node.pipeline,
      input,
      "child",
      node.versionId,
    );
    await executor.query(
      `UPDATE "_damat_pipeline_node_executions" SET "child_run_id"=$2 WHERE "id"=$1`,
      [execution.id, child.id],
    );
    await waitNode(executor, execution);
    return;
  }
  if (!execution.child_run_id) return;
  const child = await findPipelineRun(execution.child_run_id, executor);
  if (!child?.completedAt) return;
  if (child.status === "succeeded")
    await completeForwardNode(executor, run, execution, child.output);
  else
    await failForwardNode(executor, run, execution, node, {
      name: "ChildPipelineFailed",
      message: `Child pipeline ended as ${child.status}`,
      childRunId: child.id,
    });
}
