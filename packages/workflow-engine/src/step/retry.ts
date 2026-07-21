import { Duration, Effect, Schedule } from "@damatjs/deps/effect";
import { createContextLogger } from "@damatjs/logger";
import type { RequiredStepConfig, WorkflowContext } from "../types";
import {
  MaxRetriesExceededError,
  StepExecutionError,
  StepTimeoutError,
} from "../errors";

type StepFailure = StepExecutionError | StepTimeoutError;

export function withStepRetries<A>(
  effect: Effect.Effect<A, StepFailure>,
  stepName: string,
  config: RequiredStepConfig,
  ctx: WorkflowContext,
  attempts: { count: number },
) {
  const logger = createContextLogger({
    workflow: ctx.workflowName,
    step: stepName,
    executionId: ctx.executionId,
  });
  const policy = config.retry;
  const maxAttempts = policy.maxAttempts ?? 0;
  if (maxAttempts > 0 && !config.idempotent) {
    logger.warn("Retry policy ignored: step is marked idempotent: false", {
      maxAttempts,
    });
  }
  if (maxAttempts === 0 || !config.idempotent) return effect;
  const schedule = Schedule.exponential(
    Duration.millis(policy.initialDelayMs ?? 100),
    policy.backoffMultiplier ?? 2,
  ).pipe(
    Schedule.union(Schedule.spaced(Duration.millis(policy.maxDelayMs ?? 5000))),
    Schedule.intersect(Schedule.recurs(maxAttempts)),
  );
  return Effect.retry(effect, {
    schedule,
    while: (error: StepFailure) => {
      const original =
        error instanceof StepExecutionError ? (error.cause ?? error) : error;
      return policy.isRetryable
        ? policy.isRetryable(original)
        : !(original instanceof Error && original.name === "ValidationError");
    },
  }).pipe(
    Effect.catchAll((error): Effect.Effect<never, StepFailure> => {
      if (attempts.count > maxAttempts) {
        logger.warn("Step retries exhausted", {
          attempts: attempts.count,
          maxRetries: maxAttempts,
        });
        if (ctx.engineState) {
          ctx.engineState.retriesExceeded = new MaxRetriesExceededError(
            stepName,
            maxAttempts,
            error,
            ctx.workflowName,
          );
        }
      }
      return Effect.fail(error);
    }),
  );
}
