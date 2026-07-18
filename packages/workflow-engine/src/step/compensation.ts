import { Cause, Effect, Exit } from "@damatjs/deps/effect";
import { createContextLogger } from "@damatjs/logger";
import type { StepDefinition, WorkflowContext } from "../types";
import { CompensationError } from "../errors";
import { emitWorkflowExecutionEvent } from "../workflow/observe";

export function registerStepCompensation<I, O, C>(
  step: StepDefinition<I, O, C>,
  input: C,
  ctx: WorkflowContext,
) {
  if (!step.compensate) return Effect.void;
  const logger = createContextLogger({
    workflow: ctx.workflowName,
    step: step.name,
    executionId: ctx.executionId,
  });
  const state = ctx.engineState;
  return Effect.addFinalizer((exit) => {
    if (!Exit.isFailure(exit)) return Effect.void;
    logger.info("Running compensation for step");
    return Effect.tryPromise({
      try: async () => {
        await emitWorkflowExecutionEvent(state?.observer, {
          type: "compensation.started",
          workflow: ctx.workflowName,
          executionId: ctx.executionId,
          step: step.name,
        });
        await step.compensate!(input, ctx);
        await emitWorkflowExecutionEvent(state?.observer, {
          type: "compensation.succeeded",
          workflow: ctx.workflowName,
          executionId: ctx.executionId,
          step: step.name,
        });
        if (state) state.compensationsRun++;
      },
      catch: (error) => {
        void emitWorkflowExecutionEvent(state?.observer, {
          type: "compensation.failed",
          workflow: ctx.workflowName,
          executionId: ctx.executionId,
          step: step.name,
        });
        logger.error(
          "Compensation failed",
          error instanceof Error ? error : new Error(String(error)),
          { originalError: Cause.squash(exit.cause) },
        );
        const wrapped = new CompensationError(
          step.name,
          error instanceof Error ? error.message : String(error),
          error,
          ctx.workflowName,
        );
        if (state) {
          state.compensationsFailed++;
          (state.compensationErrors ??= []).push(wrapped);
        }
        return wrapped;
      },
    }).pipe(Effect.catchAll(() => Effect.void));
  });
}
