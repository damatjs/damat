import { Effect, Scope } from "@damatjs/deps/effect";
import type { StepDefinition, StepConfig, WorkflowContext } from "../types";
import type { WorkflowError } from "../errors";
import { executeStep } from "../step";

/**
 * Helper to run a step within a workflow definition.
 * Provides cleaner syntax for step execution.
 *
 * @param step - Step definition to execute
 * @param input - Input data for the step
 * @param ctx - Workflow context
 * @param overrideConfig - Optional per-call timeout/retry override, layered on
 *   top of the step's own config (forwarded to `executeStep`).
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
export function runStep<I, O, C = undefined>(
  step: StepDefinition<I, O, C>,
  input: I,
  ctx: WorkflowContext,
  overrideConfig?: StepConfig,
): Effect.Effect<O, WorkflowError, Scope.Scope> {
  return executeStep(step, input, ctx, overrideConfig);
}
