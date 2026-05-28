import { Effect, Scope } from "effect";
import type { StepDefinition, WorkflowContext } from "../types";
import type { WorkflowError } from "../errors";
import { executeStep } from "../step";

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
