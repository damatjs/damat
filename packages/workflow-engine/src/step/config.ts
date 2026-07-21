import type {
  RequiredStepConfig,
  StepConfig,
  StepDefinition,
  WorkflowContext,
} from "../types";
import { DEFAULT_RETRY_POLICY, DEFAULT_STEP_CONFIG } from "../config";

export function resolveStepConfig<I, O, C>(
  step: StepDefinition<I, O, C>,
  ctx: WorkflowContext,
  override?: StepConfig,
): RequiredStepConfig {
  const workflowDefaults = ctx.engineState?.defaultStepConfig;
  const raw = step.rawConfig;
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
