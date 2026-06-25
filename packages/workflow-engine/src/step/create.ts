import type {
  StepConfig,
  StepDefinition,
  RequiredStepConfig,
  WorkflowContext,
} from "../types";
import type { StepResponse } from "./response";
import { DEFAULT_STEP_CONFIG, DEFAULT_RETRY_POLICY } from "../config";
import { executeStep } from "./execute";

/**
 * Creates a workflow step with typed input/output and optional compensation.
 *
 * @param name - Unique step name for logging and tracing
 * @param invoke - Main step execution function. Returns a {@link StepResponse}
 *   wrapping the step's `output` and an optional `compensateInput`.
 * @param compensate - Optional rollback function called on workflow failure.
 *   Receives the `compensateInput` from the step's `StepResponse` (or `undefined`
 *   when none was provided — no output fallback) plus the workflow context.
 * @param config - Step configuration (timeout, retry, etc.)
 * @returns Step definition object
 *
 * @example
 * ```typescript
 * const createOrderStep = createStep<{ userId: string; items: Item[] }, Order, string>(
 *   'create-order',
 *   async (input, ctx) => {
 *     const order = await orderService.create(input);
 *     // output = the order (downstream); compensateInput = its id (rollback)
 *     return new StepResponse(order, order.id);
 *   },
 *   async (orderId, ctx) => {
 *     // Compensation: cancel the order if a later step fails
 *     await orderService.cancel(orderId);
 *   },
 *   { timeoutMs: 5000, retry: RetryPolicies.standard }
 * );
 * ```
 */
export function createStep<I, O, C = undefined>(
  name: string,
  invoke: (
    input: I,
    ctx: WorkflowContext,
    signal?: AbortSignal,
  ) => Promise<StepResponse<O, C>>,
  compensate?: (compensateInput: C, ctx: WorkflowContext) => Promise<void>,
  config: StepConfig = {},
): StepDefinition<I, O, C> {
  const mergedConfig: RequiredStepConfig = {
    ...DEFAULT_STEP_CONFIG,
    ...config,
    retry: { ...DEFAULT_RETRY_POLICY, ...config.retry },
  };

  // The step is a callable: `step(input, ctx)` ≡ `executeStep(step, input, ctx)`,
  // and an optional third argument forwards a per-call config override
  // (`step(input, ctx, { timeoutMs, retry })`). executeStep reads
  // `step.invoke`/`name`/`config` — it never calls `step()`, so no recursion.
  const step = ((input: I, ctx: WorkflowContext, overrideConfig?: StepConfig) =>
    executeStep(step, input, ctx, overrideConfig)) as unknown as StepDefinition<
    I,
    O,
    C
  >;
  Object.defineProperty(step, "name", { value: name, configurable: true });
  step.config = mergedConfig;
  step.rawConfig = config;
  step.invoke = invoke;
  if (compensate) step.compensate = compensate;
  return step;
}
