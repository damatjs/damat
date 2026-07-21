import { Duration, Effect } from "@damatjs/deps/effect";
import type {
  RequiredStepConfig,
  StepDefinition,
  WorkflowContext,
} from "../types";
import { StepExecutionError, StepTimeoutError } from "../errors";
import { emitWorkflowExecutionEvent } from "../workflow/observe";
import type { StepResponse } from "./response";

export interface StepAttemptState {
  count: number;
}

export function createStepAttempt<I, O, C>(
  step: StepDefinition<I, O, C>,
  input: I,
  ctx: WorkflowContext,
  config: RequiredStepConfig,
  state: StepAttemptState,
) {
  return Effect.timeoutFail(
    Effect.tryPromise({
      try: async (signal) => {
        state.count++;
        const startedAt = Date.now();
        await emitWorkflowExecutionEvent(ctx.engineState?.observer, {
          type: "step.started",
          workflow: ctx.workflowName,
          executionId: ctx.executionId,
          step: step.name,
          attempt: state.count,
        });
        try {
          const result = await step.invoke(
            input,
            { ...ctx, attempt: state.count },
            signal,
          );
          await emitWorkflowExecutionEvent(ctx.engineState?.observer, {
            type: "step.succeeded",
            workflow: ctx.workflowName,
            executionId: ctx.executionId,
            step: step.name,
            attempt: state.count,
            durationMs: Date.now() - startedAt,
          });
          return result;
        } catch (error) {
          await emitWorkflowExecutionEvent(ctx.engineState?.observer, {
            type: "step.failed",
            workflow: ctx.workflowName,
            executionId: ctx.executionId,
            step: step.name,
            attempt: state.count,
            durationMs: Date.now() - startedAt,
          });
          throw error;
        }
      },
      catch: (error) =>
        new StepExecutionError(
          step.name,
          error instanceof Error ? error.message : String(error),
          error,
          ctx.workflowName,
        ),
    }),
    {
      duration: Duration.millis(config.timeoutMs),
      onTimeout: () =>
        new StepTimeoutError(step.name, config.timeoutMs, ctx.workflowName),
    },
  ) as Effect.Effect<StepResponse<O, C>, StepExecutionError | StepTimeoutError>;
}
