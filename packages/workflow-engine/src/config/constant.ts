import type { RequiredStepConfig, RequiredWorkflowConfig } from "../types";
import { DEFAULT_RETRY_POLICY } from './retry/default';

/**
 * Default step configuration
 */
export const DEFAULT_STEP_CONFIG: RequiredStepConfig = {
  timeoutMs: 30_000, // 30 seconds
  retry: DEFAULT_RETRY_POLICY,
  // Steps are presumed safe to retry; `idempotent: false` disables retries
  // for a step so its side effects are never duplicated.
  idempotent: true,
  description: "",
};

/**
 * Default workflow configuration
 */
export const DEFAULT_WORKFLOW_CONFIG: RequiredWorkflowConfig = {
  timeoutMs: 300_000, // 5 minutes
  defaultStepConfig: DEFAULT_STEP_CONFIG,
};
