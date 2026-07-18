import type { NodeExecutionRow } from "./node-rows";
import type { RunRow } from "./rows";
import type { PipelineNodeExecution, PipelineRun } from "./types";

export function mapPipelineRun(row: RunRow): PipelineRun {
  return {
    id: row.id,
    definitionId: row.definition_id,
    versionId: row.version_id,
    name: row.name,
    version: row.source_version,
    status: row.status,
    input: row.input,
    ...(row.output !== null ? { output: row.output } : {}),
    ...(row.error ? { error: row.error } : {}),
    metadata: row.metadata,
    trigger: row.trigger,
    ...(row.correlation_id ? { correlationId: row.correlation_id } : {}),
    ...(row.idempotency_key ? { idempotencyKey: row.idempotency_key } : {}),
    ...(row.parent_run_id ? { parentRunId: row.parent_run_id } : {}),
    ...(row.parent_node_execution_id
      ? { parentNodeExecutionId: row.parent_node_execution_id }
      : {}),
    ...(row.retention_at ? { retentionAt: row.retention_at } : {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...(row.completed_at ? { completedAt: row.completed_at } : {}),
  };
}

export function mapNodeExecution(row: NodeExecutionRow): PipelineNodeExecution {
  return {
    id: row.id,
    runId: row.run_id,
    nodeId: row.node_id,
    activationKey: row.activation_key,
    phase: row.phase,
    kind: row.kind,
    status: row.status,
    ...(row.input !== null ? { input: row.input } : {}),
    ...(row.output !== null ? { output: row.output } : {}),
    ...(row.error ? { error: row.error } : {}),
    ...(row.job_run_id ? { jobRunId: row.job_run_id } : {}),
    ...(row.child_run_id ? { childRunId: row.child_run_id } : {}),
    availableAt: row.available_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...(row.completed_at ? { completedAt: row.completed_at } : {}),
  };
}
