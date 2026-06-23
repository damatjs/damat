import type {
  StepConfig,
  StepDefinition,
  RequiredStepConfig,
  WorkflowContext,
} from "../types";
import { DEFAULT_STEP_CONFIG, DEFAULT_RETRY_POLICY } from "../config";
import { executeStep } from "./execute";

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
  invoke: (input: I, ctx: WorkflowContext, signal?: AbortSignal) => Promise<O>,
  compensate?: (input: I, output: O, ctx: WorkflowContext) => Promise<void>,
  config: StepConfig = {},
): StepDefinition<I, O> {
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
    O
  >;
  Object.defineProperty(step, "name", { value: name, configurable: true });
  step.config = mergedConfig;
  step.rawConfig = config;
  step.invoke = invoke;
  if (compensate) step.compensate = compensate;
  return step;
}
