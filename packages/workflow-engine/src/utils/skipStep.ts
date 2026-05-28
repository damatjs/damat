import { Effect } from "effect";

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
