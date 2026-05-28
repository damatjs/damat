import type { StepConfig, RequiredStepConfig } from "./step";

/**
 * Workflow configuration options
 */
export interface WorkflowConfig {
  /** Overall workflow timeout in milliseconds (default: 300000 = 5 min) */
  timeoutMs?: number;
  /** Default step configuration */
  defaultStepConfig?: StepConfig;
}

/**
 * Required workflow configuration (with defaults applied)
 */
export interface RequiredWorkflowConfig {
  timeoutMs: number;
  defaultStepConfig: RequiredStepConfig;
}
