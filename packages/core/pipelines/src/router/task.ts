import type { DurabilityExecutor } from "@damatjs/durability";
import { enqueueJob } from "@damatjs/jobs";
import {
  getPipelineJob,
  validatePipelineSchema,
  type PipelineTaskNode,
} from "../definitions";
import type { NodeExecutionRow, RunRow } from "../repositories";
import { PIPELINE_EXECUTOR_JOB } from "../runtime";

export async function dispatchTask(
  executor: DurabilityExecutor,
  run: RunRow,
  execution: NodeExecutionRow,
  node: PipelineTaskNode,
  input: unknown,
): Promise<string> {
  if (node.kind === "job") {
    validatePipelineSchema(
      input,
      getPipelineJob(node.name)?.inputSchema,
      `${node.name}.input`,
    );
  }
  const internal = node.kind === "action" || node.kind === "workflow";
  const payload = internal
    ? {
        pipelineRunId: run.id,
        nodeExecutionId: execution.id,
        nodeId: execution.node_id,
        kind: node.kind,
        capability: node.name,
        input,
      }
    : input;
  const job = await enqueueJob(
    internal ? PIPELINE_EXECUTOR_JOB : node.name,
    payload,
    {
      executor,
      correlationId: run.correlation_id ?? run.id,
      ...(node.retry?.maxAttempts !== undefined
        ? { maxAttempts: node.retry.maxAttempts }
        : {}),
      ...(node.retry?.backoffMs !== undefined
        ? { backoffMs: node.retry.backoffMs }
        : {}),
      ...(node.retry?.backoffMultiplier !== undefined
        ? { backoffMultiplier: node.retry.backoffMultiplier }
        : {}),
      metadata: {
        pipeline: run.name,
        _damatPipeline: {
          runId: run.id,
          nodeExecutionId: execution.id,
          pipeline: run.name,
        },
      },
    },
  );
  await executor.query(
    `UPDATE "_damat_pipeline_node_executions" SET "status"='queued',
       "input"=$2::jsonb,"job_run_id"=$3,"started_at"=NOW(),"updated_at"=NOW()
     WHERE "id"=$1`,
    [execution.id, JSON.stringify(input ?? null), job.id],
  );
  return job.queue;
}
