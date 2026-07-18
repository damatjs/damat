import type { DurabilityExecutor } from "@damatjs/durability";
import { startPipeline } from "../client";
import type { NodeExecutionRow, RunRow } from "../repositories";

export async function startChildRun(
  executor: DurabilityExecutor,
  run: RunRow,
  execution: NodeExecutionRow,
  pipeline: string,
  input: unknown,
  suffix = "child",
  versionId?: string,
) {
  return startPipeline(pipeline, input, {
    executor,
    ...(versionId ? { versionId } : {}),
    correlationId: run.correlation_id ?? run.id,
    idempotencyKey: `${run.id}:${execution.id}:${suffix}`,
    parentRunId: run.id,
    parentNodeExecutionId: execution.id,
    trigger: {
      kind: "child",
      parentRunId: run.id,
      parentNodeId: execution.node_id,
      activation: suffix,
    },
    actor: { id: "pipeline-router", type: "system" },
  });
}
