import type { PipelineJobBinding } from "./types";

export function pipelineJobBinding(
  metadata: Record<string, unknown>,
): PipelineJobBinding | undefined {
  const raw = metadata._damatPipeline;
  if (!raw || typeof raw !== "object") return undefined;
  const value = raw as Record<string, unknown>;
  if (
    typeof value.runId !== "string" ||
    typeof value.nodeExecutionId !== "string" ||
    typeof value.pipeline !== "string"
  )
    return undefined;
  return {
    runId: value.runId,
    nodeExecutionId: value.nodeExecutionId,
    pipeline: value.pipeline,
  };
}
