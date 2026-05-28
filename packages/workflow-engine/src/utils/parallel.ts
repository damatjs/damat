import { Effect } from "effect";

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
