/**
 * Workflow Engine - Utility Functions
 *
 * Helper functions for common workflow patterns.
 */

import { Effect, Scope } from "effect";
import type { StepDefinition, WorkflowContext } from "./types";
import type { WorkflowError } from "./errors";
import { executeStep } from "./step";

// =============================================================================
// STEP EXECUTION HELPERS
// =============================================================================

/**
 * Helper to run a step within a workflow definition.
 * Provides cleaner syntax for step execution.
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
 *     const result = yield* runStep(myStep, input, ctx);
 *     return result;
 *   })
 * );
 * ```
 */
export function runStep<I, O>(
  step: StepDefinition<I, O>,
  input: I,
  ctx: WorkflowContext,
): Effect.Effect<O, WorkflowError, Scope.Scope> {
  return executeStep(step, input, ctx);
}

// =============================================================================
// CONDITIONAL HELPERS
// =============================================================================

/**
 * Creates a no-op step for conditional workflows.
 * Returns the value immediately without any execution.
 *
 * @param value - Value to return
 * @returns Effect that immediately succeeds with the value
 *
 * @example
 * ```typescript
 * const workflow = createWorkflow('conditional', (input, ctx) =>
 *   Effect.gen(function* (_) {
 *     const result = input.skipProcessing
 *       ? yield* skipStep({ skipped: true })
 *       : yield* runStep(processStep, input, ctx);
 *     return result;
 *   })
 * );
 * ```
 */
export function skipStep<T>(value: T): Effect.Effect<T, never, never> {
  return Effect.succeed(value);
}

// =============================================================================
// PARALLEL EXECUTION
// =============================================================================

/**
 * Combines multiple independent steps to run in parallel.
 * All effects run concurrently and the result is a tuple of all outputs.
 *
 * @param effects - Array of effects to run in parallel
 * @returns Effect that resolves to array of all outputs
 *
 * @example
 * ```typescript
 * const workflow = createWorkflow('parallel-tasks', (input, ctx) =>
 *   Effect.gen(function* (_) {
 *     // Run three independent steps in parallel
 *     const [user, products, inventory] = yield* parallel(
 *       runStep(fetchUserStep, { userId: input.userId }, ctx),
 *       runStep(fetchProductsStep, { ids: input.productIds }, ctx),
 *       runStep(checkInventoryStep, { ids: input.productIds }, ctx),
 *     );
 *
 *     return { user, products, inventory };
 *   })
 * );
 * ```
 */
export function parallel<T extends readonly Effect.Effect<any, any, any>[]>(
  ...effects: T
): Effect.Effect<
  { [K in keyof T]: Effect.Effect.Success<T[K]> },
  Effect.Effect.Error<T[number]>,
  Effect.Effect.Context<T[number]>
> {
  return Effect.all(effects, { concurrency: "unbounded" }) as any;
}

// =============================================================================
// CONDITIONAL EXECUTION
// =============================================================================

/**
 * Conditionally execute a step based on a predicate.
 *
 * @param condition - Boolean condition
 * @param step - Step to execute if condition is true
 * @param input - Input for the step
 * @param ctx - Workflow context
 * @param defaultValue - Value to return if condition is false
 * @returns Effect that resolves to step output or default value
 *
 * @example
 * ```typescript
 * const result = yield* when(
 *   input.needsVerification,
 *   verifyStep,
 *   input,
 *   ctx,
 *   { verified: false }
 * );
 * ```
 */
export function when<I, O>(
  condition: boolean,
  step: StepDefinition<I, O>,
  input: I,
  ctx: WorkflowContext,
  defaultValue: O,
): Effect.Effect<O, WorkflowError, Scope.Scope> {
  if (condition) {
    return executeStep(step, input, ctx);
  }
  return Effect.succeed(defaultValue);
}

/**
 * Execute one of two steps based on a condition.
 *
 * @param condition - Boolean condition
 * @param ifTrue - Step to execute if condition is true
 * @param ifFalse - Step to execute if condition is false
 * @param input - Input for the steps
 * @param ctx - Workflow context
 * @returns Effect that resolves to the executed step's output
 *
 * @example
 * ```typescript
 * const result = yield* ifElse(
 *   input.isPremium,
 *   premiumProcessStep,
 *   standardProcessStep,
 *   input,
 *   ctx
 * );
 * ```
 */
export function ifElse<I, O>(
  condition: boolean,
  ifTrue: StepDefinition<I, O>,
  ifFalse: StepDefinition<I, O>,
  input: I,
  ctx: WorkflowContext,
): Effect.Effect<O, WorkflowError, Scope.Scope> {
  return executeStep(condition ? ifTrue : ifFalse, input, ctx);
}
