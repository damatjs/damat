import { Effect, Scope, Exit, Cause, Duration } from "@damatjs/deps/effect";
import type {
  RequiredWorkflowConfig,
  WorkflowContext,
  WorkflowEngineState,
  WorkflowResult,
} from "../types";
import { WorkflowError } from "../errors";
import { createContextLogger } from "@damatjs/logger";

/**
 * Internal workflow execution logic.
 */
export async function executeWorkflowInternal<I, O>(
  name: string,
  definition: (
    input: I,
    ctx: WorkflowContext,
  ) => Effect.Effect<O, WorkflowError, Scope.Scope>,
  mergedConfig: RequiredWorkflowConfig,
  input: I,
  metadata: Record<string, unknown>,
  executionId: string,
): Promise<WorkflowResult<O>> {
  const workflowLogger = createContextLogger({ workflow: name });
  const startedAt = new Date();
  const startTime = Date.now();

  const engineState: WorkflowEngineState = {
    compensationsRun: 0,
    compensationsFailed: 0,
    defaultStepConfig: mergedConfig.defaultStepConfig,
  };

  const ctx: WorkflowContext = {
    executionId,
    workflowName: name,
    startedAt,
    attempt: 1,
    metadata,
    engineState,
  };

  workflowLogger.info(`Starting workflow execution`, { executionId });
  // Inputs may carry credentials/PII — only surface them at debug level.
  workflowLogger.debug(`Workflow input`, {
    executionId,
    input: JSON.stringify(input),
  });

  // Wrap the workflow definition with timeout
  const workflowEffect = Effect.timeoutFail(
    Effect.scoped(definition(input, ctx)),
    {
      duration: Duration.millis(mergedConfig.timeoutMs),
      onTimeout: () =>
        new WorkflowError(
          "WORKFLOW_TIMEOUT",
          `Workflow '${name}' timed out after ${mergedConfig.timeoutMs}ms`,
          name,
        ),
    },
  );

  const exit = await Effect.runPromiseExit(workflowEffect);
  const durationMs = Date.now() - startTime;

  if (Exit.isSuccess(exit)) {
    workflowLogger.info(`Workflow completed successfully`, {
      executionId,
      durationMs,
    });

    return {
      success: true,
      result: exit.value,
      executionId,
      durationMs,
    };
  } else {
    const rawError = Cause.squash(exit.cause);
    // A step exhausted its retries: surface MAX_RETRIES_EXCEEDED at the
    // workflow boundary (the step itself failed with its last original error).
    const error = engineState.retriesExceeded
      ? engineState.retriesExceeded
      : rawError instanceof WorkflowError
        ? rawError
        : new WorkflowError(
            "WORKFLOW_FAILED",
            rawError instanceof Error ? rawError.message : String(rawError),
            name,
            undefined,
            rawError,
          );

    workflowLogger.error(`Workflow failed`, error, {
      executionId,
      durationMs,
      errorCode: error.code,
      compensationsRun: engineState.compensationsRun,
      compensationsFailed: engineState.compensationsFailed,
    });

    return {
      success: false,
      error,
      executionId,
      durationMs,
      compensated: engineState.compensationsRun > 0,
      compensationsFailed: engineState.compensationsFailed,
      compensationErrors: engineState.compensationErrors ?? [],
    };
  }
}
