import type { DurabilityExecutor } from "@damatjs/durability";
import type { PipelineForEachNode } from "../definitions";
import type { NodeExecutionRow, RunRow } from "../repositories";
import { evaluatePipelineValue } from "../runtime";
import { loadEvaluationContext } from "../runtime/context";
import {
  childRuns,
  startAvailableChildren,
  storedItems,
} from "./foreach-children";
import { completeForwardNode, failForwardNode } from "./outcome";
import { waitNode } from "./update";

export async function processForEach(
  executor: DurabilityExecutor,
  run: RunRow,
  execution: NodeExecutionRow,
  node: PipelineForEachNode,
): Promise<void> {
  if (execution.status === "ready") {
    const context = await loadEvaluationContext(executor, run);
    const items = evaluatePipelineValue(node.items, context);
    if (!Array.isArray(items))
      throw new Error(`Pipeline foreach "${node.id}" did not resolve an array`);
    if (items.length > node.maxItems)
      throw new Error(`Pipeline foreach "${node.id}" exceeds maxItems`);
    if (!items.length) {
      await completeForwardNode(executor, run, execution, []);
      return;
    }
    await executor.query(
      `UPDATE "_damat_pipeline_node_executions" SET "input"=$2::jsonb WHERE "id"=$1`,
      [execution.id, JSON.stringify({ items })],
    );
    await startAvailableChildren(executor, run, execution, node, items, 0, 0);
    await waitNode(executor, execution);
    return;
  }
  const items = storedItems(execution);
  const children = await childRuns(executor, execution.id);
  const failed = children.find(
    (child) => child.completed_at && child.status !== "succeeded",
  );
  const active = children.filter((child) => child.completed_at === null).length;
  if (!failed && children.length < items.length) {
    const started = await startAvailableChildren(
      executor,
      run,
      execution,
      node,
      items,
      children.length,
      active,
    );
    if (active + started > 0 || children.length + started < items.length)
      return;
  }
  if (active) return;
  if (failed) {
    await failForwardNode(executor, run, execution, node, {
      name: "ForEachChildFailed",
      message: `Child ${failed.id} ended as ${failed.status}`,
    });
    return;
  }
  await completeForwardNode(
    executor,
    run,
    execution,
    children.map((child) => child.output),
  );
}
