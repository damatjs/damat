import type {
  StepConfig,
  StepDefinition,
  RequiredStepConfig,
  WorkflowContext,
} from "../types";
import { DEFAULT_STEP_CONFIG, DEFAULT_RETRY_POLICY } from "../config";

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
