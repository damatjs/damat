import { Cause, Exit } from "@damatjs/deps/effect";
import { createContextLogger } from "@damatjs/logger";
import type { WorkflowEngineState, WorkflowResult } from "../types";
import type { WorkflowExecutionOptions } from "../types/observer";
import { WorkflowError } from "../errors";
import { emitWorkflowExecutionEvent } from "./observe";

export async function resolveWorkflowExit<O>(
  name: string,
  executionId: string,
  durationMs: number,
  exit: Exit.Exit<O, WorkflowError>,
  state: WorkflowEngineState,
  options: WorkflowExecutionOptions,
): Promise<WorkflowResult<O>> {
  const logger = createContextLogger({ workflow: name });
  if (Exit.isSuccess(exit)) {
    logger.info("Workflow completed successfully", { executionId, durationMs });
    await emitWorkflowExecutionEvent(options.observer, {
      type: "workflow.succeeded",
      workflow: name,
      executionId,
      durationMs,
    });
    return {
      success: true,
      result: exit.value,
      executionId,
      durationMs,
    };
  }
  const raw = Cause.squash(exit.cause);
  const error = state.retriesExceeded
    ? state.retriesExceeded
    : raw instanceof WorkflowError
      ? raw
      : new WorkflowError(
          "WORKFLOW_FAILED",
          raw instanceof Error ? raw.message : String(raw),
          name,
          undefined,
          raw,
        );
  logger.error("Workflow failed", error, {
    executionId,
    durationMs,
    errorCode: error.code,
    compensationsRun: state.compensationsRun,
    compensationsFailed: state.compensationsFailed,
  });
  await emitWorkflowExecutionEvent(options.observer, {
    type: "workflow.failed",
    workflow: name,
    executionId,
    durationMs,
  });
  return {
    success: false,
    error,
    executionId,
    durationMs,
    compensated: state.compensationsRun > 0,
    compensationsFailed: state.compensationsFailed,
    compensationErrors: state.compensationErrors ?? [],
  };
}
