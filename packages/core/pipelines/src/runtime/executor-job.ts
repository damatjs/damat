import { defineJob, getJobDefinition, type JobRunContext } from "@damatjs/jobs";
import {
  getPipelineAction,
  getPipelineWorkflow,
  validatePipelineSchema,
} from "../definitions";
import {
  PIPELINE_EXECUTOR_JOB,
  type PipelineExecutorPayload,
} from "./job-payload";
import { pipelineWorkflowObserver } from "./workflow-observer";

export function registerPipelineExecutorJob(queue = "damat-pipelines"): void {
  const existing = getJobDefinition(PIPELINE_EXECUTOR_JOB);
  if (existing) {
    if (existing.options.queue !== queue)
      throw new Error("Pipeline executor queue changed after registration");
    return;
  }
  defineJob(
    PIPELINE_EXECUTOR_JOB,
    (payload, context) =>
      executePipelineCapability(payload as PipelineExecutorPayload, context),
    { queue },
  );
}

async function executePipelineCapability(
  payload: PipelineExecutorPayload,
  context: JobRunContext,
): Promise<unknown> {
  if (payload.kind === "action") {
    const action = getPipelineAction(payload.capability);
    if (!action)
      throw new Error(`Unknown pipeline action "${payload.capability}"`);
    validatePipelineSchema(
      payload.input,
      action.inputSchema,
      `${payload.capability}.input`,
    );
    const result = await action.handler(payload.input, {
      ...context,
      pipelineRunId: payload.pipelineRunId,
      nodeExecutionId: payload.nodeExecutionId,
      nodeId: payload.nodeId,
    });
    validatePipelineSchema(
      result,
      action.outputSchema,
      `${payload.capability}.output`,
    );
    return result;
  }
  const registered = getPipelineWorkflow(payload.capability);
  if (!registered)
    throw new Error(`Unknown pipeline workflow "${payload.capability}"`);
  validatePipelineSchema(
    payload.input,
    registered.inputSchema,
    `${payload.capability}.input`,
  );
  const result = await registered.workflow.execute(
    payload.input,
    { pipelineRunId: payload.pipelineRunId, nodeId: payload.nodeId },
    {
      executionId: payload.nodeExecutionId,
      signal: context.signal,
      observer: pipelineWorkflowObserver(context),
    },
  );
  if (!result.success) throw result.error;
  validatePipelineSchema(
    result.result,
    registered.outputSchema,
    `${payload.capability}.output`,
  );
  return result.result;
}
