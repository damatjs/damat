import type { DurabilityExecutor } from "@damatjs/durability";
import type { PipelineDelayNode } from "../definitions";
import type { NodeExecutionRow, RunRow } from "../repositories";
import { completeForwardNode } from "./outcome";
import { waitNode } from "./update";

export async function processDelay(
  executor: DurabilityExecutor,
  run: RunRow,
  execution: NodeExecutionRow,
  node: PipelineDelayNode,
): Promise<void> {
  if (execution.status === "ready") {
    await waitNode(executor, execution, new Date(Date.now() + node.delayMs));
    return;
  }
  if (execution.available_at.getTime() > Date.now()) return;
  await completeForwardNode(executor, run, execution, {
    delayedMs: node.delayMs,
  });
}
