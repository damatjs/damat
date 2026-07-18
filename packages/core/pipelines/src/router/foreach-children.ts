import type { DurabilityExecutor } from "@damatjs/durability";
import type { PipelineForEachNode } from "../definitions";
import type { NodeExecutionRow, RunRow } from "../repositories";
import type { ChildRunRow } from "./child-rows";
import { startChildRun } from "./child-start";

export async function startAvailableChildren(
  executor: DurabilityExecutor,
  run: RunRow,
  execution: NodeExecutionRow,
  node: PipelineForEachNode,
  items: unknown[],
  offset: number,
  active: number,
): Promise<number> {
  const capacity = Math.max(0, (node.concurrency ?? node.maxItems) - active);
  const end = Math.min(items.length, offset + capacity);
  for (let index = offset; index < end; index++) {
    await startChildRun(
      executor,
      run,
      execution,
      node.pipeline,
      items[index],
      `item:${index}`,
    );
  }
  return end - offset;
}

export function storedItems(execution: NodeExecutionRow): unknown[] {
  const value = execution.input;
  if (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Array.isArray((value as { items?: unknown }).items)
  ) {
    return (value as { items: unknown[] }).items;
  }
  throw new Error(
    `Pipeline foreach "${execution.node_id}" has no stored item projection`,
  );
}

export function childRuns(executor: DurabilityExecutor, executionId: string) {
  return executor
    .query<ChildRunRow>(
      `SELECT "id","status","input","output","error","completed_at","created_at"
       FROM "_damat_pipeline_runs" WHERE "parent_node_execution_id"=$1
       ORDER BY split_part("trigger"->>'activation',':',2)::int,"id"`,
      [executionId],
    )
    .then((result) => result.rows);
}
