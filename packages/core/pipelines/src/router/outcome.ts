import type { DurabilityExecutor } from "@damatjs/durability";
import type { PipelineNode } from "../definitions";
import type { NodeExecutionRow, RunRow } from "../repositories";
import { beginCompensation } from "./compensation";
import { scheduleOutgoing } from "./edges";
import { failRun, finishNode } from "./update";

export async function completeForwardNode(
  executor: DurabilityExecutor,
  run: RunRow,
  execution: NodeExecutionRow,
  output?: unknown,
): Promise<void> {
  await finishNode(executor, execution, "succeeded", output);
  await scheduleOutgoing(executor, run, execution, "success", output);
}

export async function failForwardNode(
  executor: DurabilityExecutor,
  run: RunRow,
  execution: NodeExecutionRow,
  node: PipelineNode,
  error: Record<string, unknown>,
): Promise<void> {
  await finishNode(executor, execution, "failed", undefined, error);
  const failureEdges = await scheduleOutgoing(
    executor,
    run,
    execution,
    "failure",
  );
  if (failureEdges) return;
  if (node.failure === "continue") {
    await scheduleOutgoing(executor, run, execution, "success");
    return;
  }
  if (node.failure === "compensate") {
    await beginCompensation(executor, run, error);
    return;
  }
  await failRun(executor, run.id, error);
}

export function serializePipelineError(
  error: unknown,
): Record<string, unknown> {
  if (error instanceof Error)
    return { name: error.name, message: error.message };
  return { name: "Error", message: String(error) };
}
