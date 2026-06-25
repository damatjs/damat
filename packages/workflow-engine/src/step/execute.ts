import { Effect, Scope, Exit, Cause, Schedule, Duration } from "effect";
import type {
  StepDefinition,
  WorkflowContext,
  RequiredStepConfig,
  StepConfig,
} from "../types";
import {
  StepExecutionError,
  StepTimeoutError,
  MaxRetriesExceededError,
  CompensationError,
} from "../errors";
import { StepResponse } from "./response";
import { DEFAULT_STEP_CONFIG, DEFAULT_RETRY_POLICY } from "../config";
import { createContextLogger } from "@damatjs/logger";

/**
 * Resolves the effective config for a step execution by layering:
 * engine defaults < workflow defaultStepConfig < the step's own config <
 * the per-call override. The override is the highest-priority layer, so a
 * caller can bump a single invocation's timeout/retry without touching the
 * step definition.
 */
function resolveStepConfig<I, O, C>(
  step: StepDefinition<I, O, C>,
  ctx: WorkflowContext,
  override?: StepConfig,
): RequiredStepConfig {
  const workflowDefaults = ctx.engineState?.defaultStepConfig;
  const raw = step.rawConfig;

  // Steps built outside createStep may not carry rawConfig — fall back to
  // their pre-merged config and skip workflow-level layering. A per-call
  // override still applies on top.
  if (raw === undefined) {
    if (!override) return step.config;
    return {
      ...step.config,
      ...override,
      retry: { ...step.config.retry, ...override.retry },
    };
  }

  return {
    ...DEFAULT_STEP_CONFIG,
    ...workflowDefaults,
    ...raw,
    ...override,
    retry: {
      ...DEFAULT_RETRY_POLICY,
      ...workflowDefaults?.retry,
      ...raw.retry,
      ...override?.retry,
    },
  };
}

/**
 * Executes a step within the workflow context.
 * Handles timeout, retry, and compensation registration.
 *
 * Semantics:
 * - `timeoutMs` applies per attempt; timed-out attempts are retryable.
 * - `retry.isRetryable` receives the ORIGINAL error thrown by the step
 *   (or the StepTimeoutError for timeouts), not the engine wrapper.
 * - When all retries are exhausted, the step fails with the LAST
 *   StepExecutionError/StepTimeoutError; the corresponding
 *   MaxRetriesExceededError is recorded on the engine state so the workflow
 *   result can surface it as MAX_RETRIES_EXCEEDED.
 *
 * @param step - Step definition to execute
 * @param input - Input data for the step
 * @param ctx - Workflow context
 * @param overrideConfig - Optional per-call config (timeout/retry/idempotent/
 *   description) layered on top of the step's own config — the highest-priority
 *   layer. Omit to use the step's configured values.
 * @returns Effect that resolves to the step output
 *
 * @example
 * ```typescript
 * const workflow = createWorkflow('my-workflow', (input, ctx) =>
 *   Effect.gen(function* (_) {
 *     const order = yield* executeStep(createOrderStep, input, ctx);
 *     // Per-call override: give this one payment attempt a longer timeout and
 *     // more retries without changing the step definition.
 *     const payment = yield* executeStep(processPaymentStep, { orderId: order.id }, ctx, {
 *       timeoutMs: 15_000,
 *       retry: { maxAttempts: 5 },
 *     });
 *     return { order, payment };
 *   })
 * );
 * ```
 */
export function executeStep<I, O, C = undefined>(
  step: StepDefinition<I, O, C>,
  input: I,
  ctx: WorkflowContext,
  overrideConfig?: StepConfig,
): Effect.Effect<
  O,
  StepExecutionError | StepTimeoutError,
  Scope.Scope
> {
  const stepLogger = createContextLogger({
    workflow: ctx.workflowName,
    step: step.name,
    executionId: ctx.executionId,
  });

  return Effect.gen(function* (_) {
    const config = resolveStepConfig(step, ctx, overrideConfig);
    const startTime = Date.now();
    stepLogger.debug(`Executing step`, {
      description: config.description || step.name,
      timeout: config.timeoutMs,
    });

    const retryPolicy = config.retry;
    const maxAttempts = retryPolicy.maxAttempts ?? 0;
    const initialDelayMs = retryPolicy.initialDelayMs ?? 100;
    const backoffMultiplier = retryPolicy.backoffMultiplier ?? 2;
    const maxDelayMs = retryPolicy.maxDelayMs ?? 5000;
    const shouldRetry = maxAttempts > 0;

    // Tracks how many times invoke actually ran, so ctx.attempt is accurate
    // and we can tell "retries exhausted" apart from "error not retryable".
    let attemptCount = 0;

    // One attempt: invoke with an abort signal, bounded by the step timeout.
    const attemptEffect = Effect.timeoutFail(
      Effect.tryPromise({
        try: (signal) => {
          attemptCount++;
          return step.invoke(input, { ...ctx, attempt: attemptCount }, signal);
        },
        catch: (e) =>
          new StepExecutionError(
            step.name,
            e instanceof Error ? e.message : String(e),
            e,
            ctx.workflowName,
          ),
      }),
      {
        duration: Duration.millis(config.timeoutMs),
        onTimeout: () =>
          new StepTimeoutError(step.name, config.timeoutMs, ctx.workflowName),
      },
    );

    let executionEffect: Effect.Effect<
      StepResponse<O, C>,
      StepExecutionError | StepTimeoutError
    > = attemptEffect;

    if (shouldRetry) {
      // Exponential backoff with each delay capped at maxDelayMs,
      // bounded to maxAttempts retries.
      const schedule = Schedule.exponential(
        Duration.millis(initialDelayMs),
        backoffMultiplier,
      ).pipe(
        Schedule.union(Schedule.spaced(Duration.millis(maxDelayMs))),
        Schedule.intersect(Schedule.recurs(maxAttempts)),
      );

      const retried: Effect.Effect<
        StepResponse<O, C>,
        StepExecutionError | StepTimeoutError
      > = Effect.retry(attemptEffect, {
        schedule,
        while: (error: StepExecutionError | StepTimeoutError) => {
          // Hand the user's predicate the original error, not our wrapper.
          const original =
            error instanceof StepExecutionError
              ? (error.cause ?? error)
              : error;
          if (retryPolicy.isRetryable) {
            return retryPolicy.isRetryable(original);
          }
          // By default, don't retry validation errors
          return !(
            original instanceof Error && original.name === "ValidationError"
          );
        },
      });

      executionEffect = retried.pipe(
        Effect.catchAll(
          (
            error,
          ): Effect.Effect<
            never,
            StepExecutionError | StepTimeoutError
          > => {
            if (attemptCount > maxAttempts) {
              stepLogger.warn(`Step retries exhausted`, {
                attempts: attemptCount,
                maxRetries: maxAttempts,
              });
              if (ctx.engineState) {
                ctx.engineState.retriesExceeded = new MaxRetriesExceededError(
                  step.name,
                  maxAttempts,
                  error,
                  ctx.workflowName,
                );
              }
            }
            return Effect.fail(error);
          },
        ),
      );
    }

    const raw = yield* executionEffect;
    // Unwrap the StepResponse once: `output` flows downstream, `compensateInput`
    // is held for the compensation finalizer. The brand check (not `instanceof`)
    // also defends against a JS caller returning a bare value despite the types —
    // such a value has no compensation payload.
    const isResp = StepResponse.isStepResponse(raw);
    const output = (isResp ? (raw as StepResponse<O, C>).output : raw) as O;
    const compensateInput = (
      isResp ? (raw as StepResponse<O, C>).compensateInput : undefined
    ) as C;

    const duration = Date.now() - startTime;
    stepLogger.debug(`Step completed`, {
      durationMs: duration,
      attempts: attemptCount,
    });

    // Register compensation if provided — runs in reverse registration order
    // when the workflow scope closes with a failure (saga rollback).
    if (step.compensate) {
      const engineState = ctx.engineState;
      yield* Effect.addFinalizer((exit) => {
        if (Exit.isFailure(exit)) {
          stepLogger.info(`Running compensation for step`);
          return Effect.tryPromise({
            try: async () => {
              await step.compensate!(compensateInput, ctx);
              if (engineState) engineState.compensationsRun++;
            },
            catch: (e) => {
              if (engineState) engineState.compensationsFailed++;
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

    return output;
  });
}
