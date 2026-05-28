import { Effect, Scope } from "effect";
import type { StepDefinition, WorkflowContext } from "../types";
import type { WorkflowError } from "../errors";
import { executeStep } from "../step";

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
