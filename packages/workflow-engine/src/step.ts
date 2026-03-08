/**
 * Workflow Engine - Step
 *
 * Step creation and execution with retry, timeout, and compensation support.
 */

import { Effect, Scope, Exit, Cause, Schedule, Duration } from "effect";
import type {
  StepConfig,
  StepDefinition,
  RequiredStepConfig,
  WorkflowContext,
} from "./types";
import {
  StepExecutionError,
  StepTimeoutError,
  CompensationError,
} from "./errors";
import { DEFAULT_STEP_CONFIG, DEFAULT_RETRY_POLICY } from "./config";
import { createContextLogger } from "./logger";

// =============================================================================
// STEP CREATION
// =============================================================================

/**
 * Creates a workflow step with typed input/output and optional compensation.
 *
 * @param name - Unique step name for logging and tracing
 * @param invoke - Main step execution function
 * @param compensate - Optional rollback function called on workflow failure
 * @param config - Step configuration (timeout, retry, etc.)
 * @returns Step definition object
 *
 * @example
 * ```typescript
 * const createOrderStep = createStep(
 *   'create-order',
 *   async (input: { userId: string; items: Item[] }, ctx) => {
 *     const order = await orderService.create(input);
 *     return order;
 *   },
 *   async (input, output, ctx) => {
 *     // Compensation: cancel the order if workflow fails
 *     await orderService.cancel(output.id);
 *   },
 *   { timeoutMs: 5000, retry: RetryPolicies.standard }
 * );
 * ```
 */
export function createStep<I, O>(
  name: string,
  invoke: (input: I, ctx: WorkflowContext) => Promise<O>,
  compensate?: (input: I, output: O, ctx: WorkflowContext) => Promise<void>,
  config: StepConfig = {},
): StepDefinition<I, O> {
  const mergedConfig: RequiredStepConfig = {
    ...DEFAULT_STEP_CONFIG,
    ...config,
    retry: { ...DEFAULT_RETRY_POLICY, ...config.retry },
  };

  return {
    name,
    config: mergedConfig,
    invoke,
    ...(compensate ? { compensate } : {}),
  };
}

// =============================================================================
// STEP EXECUTION
// =============================================================================

/**
 * Executes a step within the workflow context.
 * Handles timeout, retry, and compensation registration.
 *
 * @param step - Step definition to execute
 * @param input - Input data for the step
 * @param ctx - Workflow context
 * @returns Effect that resolves to the step output
 *
 * @example
 * ```typescript
 * const workflow = createWorkflow('my-workflow', (input, ctx) =>
 *   Effect.gen(function* (_) {
 *     const order = yield* executeStep(createOrderStep, input, ctx);
 *     const payment = yield* executeStep(processPaymentStep, { orderId: order.id }, ctx);
 *     return { order, payment };
 *   })
 * );
 * ```
 */
export function executeStep<I, O>(
  step: StepDefinition<I, O>,
  input: I,
  ctx: WorkflowContext,
): Effect.Effect<O, StepExecutionError | StepTimeoutError, Scope.Scope> {
  const stepLogger = createContextLogger({
    workflow: ctx.workflowName,
    step: step.name,
    executionId: ctx.executionId,
  });

  return Effect.gen(function* (_) {
    const startTime = Date.now();
    stepLogger.debug(`Executing step`, {
      description: step.config.description || step.name,
      timeout: step.config.timeoutMs,
    });

    // Build retry schedule if configured
    const retryPolicy = step.config.retry;
    const maxAttempts = retryPolicy.maxAttempts ?? 0;
    const initialDelayMs = retryPolicy.initialDelayMs ?? 100;
    const backoffMultiplier = retryPolicy.backoffMultiplier ?? 2;
    const maxDelayMs = retryPolicy.maxDelayMs ?? 5000;
    const shouldRetry = maxAttempts > 0;

    // Create the base execution effect
    let executionEffect = Effect.tryPromise({
      try: () => step.invoke(input, { ...ctx, attempt: ctx.attempt }),
      catch: (e) =>
        new StepExecutionError(
          step.name,
          e instanceof Error ? e.message : String(e),
          e,
          ctx.workflowName,
        ),
    });

    // Add retry logic if configured
    if (shouldRetry) {
      const schedule = Schedule.exponential(
        Duration.millis(initialDelayMs),
        backoffMultiplier,
      ).pipe(
        Schedule.compose(Schedule.recurs(maxAttempts)),
        Schedule.whileOutput(
          (duration) => Duration.toMillis(duration) <= maxDelayMs,
        ),
      );

      executionEffect = Effect.retry(executionEffect, {
        schedule,
        while: (error) => {
          if (retryPolicy.isRetryable) {
            return retryPolicy.isRetryable(error);
          }
          // By default, don't retry validation errors
          return !(
            error.cause && (error.cause as Error).name === "ValidationError"
          );
        },
      });
    }

    // Add timeout
    const timedEffect = Effect.timeoutFail(executionEffect, {
      duration: Duration.millis(step.config.timeoutMs),
      onTimeout: () =>
        new StepTimeoutError(
          step.name,
          step.config.timeoutMs,
          ctx.workflowName,
        ),
    });

    // Execute with error handling
    const result = yield* timedEffect;

    const duration = Date.now() - startTime;
    stepLogger.debug(`Step completed`, { durationMs: duration });

    // Register compensation if provided
    if (step.compensate) {
      yield* Effect.addFinalizer((exit) => {
        if (Exit.isFailure(exit)) {
          stepLogger.info(`Running compensation for step`);
          return Effect.tryPromise({
            try: () => step.compensate!(input, result, ctx),
            catch: (e) => {
              // Log but don't fail - compensation errors are tracked but shouldn't cascade
              stepLogger.error(
                `Compensation failed`,
                e instanceof Error ? e : new Error(String(e)),
                { originalError: Cause.squash(exit.cause) },
              );
              return new CompensationError(
                step.name,
                e instanceof Error ? e.message : String(e),
                e,
                ctx.workflowName,
              );
            },
          }).pipe(
            Effect.catchAll(() => Effect.void), // Swallow compensation errors after logging
          );
        }
        return Effect.void;
      });
    }

    return result;
  });
}
