import type { RequiredWorkflowConfig, WorkflowConfig } from "../types";
import { DEFAULT_STEP_CONFIG, DEFAULT_WORKFLOW_CONFIG } from "../config";

export function resolveWorkflowConfig(
  config: WorkflowConfig,
): RequiredWorkflowConfig {
  return {
    ...DEFAULT_WORKFLOW_CONFIG,
    ...config,
    defaultStepConfig: {
      ...DEFAULT_STEP_CONFIG,
      ...config.defaultStepConfig,
      retry: {
        ...DEFAULT_STEP_CONFIG.retry,
        ...config.defaultStepConfig?.retry,
      },
    },
  };
}
