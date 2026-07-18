import { Duration, Effect, Scope } from "@damatjs/deps/effect";
import { createContextLogger } from "@damatjs/logger";
import type {
  RequiredWorkflowConfig,
  WorkflowContext,
  WorkflowEngineState,
  WorkflowResult,
} from "../types";
import type { WorkflowExecutionOptions } from "../types/observer";
import { WorkflowError } from "../errors";
import { emitWorkflowExecutionEvent } from "./observe";
import { resolveWorkflowExit } from "./result";

export async function executeWorkflowInternal<I, O>(
  name: string,
  definition: (
    input: I,
    ctx: WorkflowContext,
  ) => Effect.Effect<O, WorkflowError, Scope.Scope>,
  config: RequiredWorkflowConfig,
  input: I,
  metadata: Record<string, unknown>,
  executionId: string,
  options: WorkflowExecutionOptions = {},
): Promise<WorkflowResult<O>> {
  const startedAt = new Date();
  const state: WorkflowEngineState = {
    compensationsRun: 0,
    compensationsFailed: 0,
    defaultStepConfig: config.defaultStepConfig,
    ...(options.observer ? { observer: options.observer } : {}),
  };
  const ctx: WorkflowContext = {
    executionId,
    workflowName: name,
    startedAt,
    attempt: 1,
    metadata,
    engineState: state,
  };
  const logger = createContextLogger({ workflow: name });
  logger.info("Starting workflow execution", { executionId });
  logger.debug("Workflow input", { executionId, input: JSON.stringify(input) });
  await emitWorkflowExecutionEvent(options.observer, {
    type: "workflow.started",
    workflow: name,
    executionId,
  });
  const effect = Effect.timeoutFail(Effect.scoped(definition(input, ctx)), {
    duration: Duration.millis(config.timeoutMs),
    onTimeout: () =>
      new WorkflowError(
        "WORKFLOW_TIMEOUT",
        `Workflow '${name}' timed out after ${config.timeoutMs}ms`,
        name,
      ),
  });
  const started = Date.now();
  const exit = await Effect.runPromiseExit(
    effect,
    options.signal ? { signal: options.signal } : undefined,
  );
  return resolveWorkflowExit(
    name,
    executionId,
    Date.now() - started,
    exit,
    state,
    options,
  );
}
