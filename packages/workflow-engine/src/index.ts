/**
 * Production-Ready Workflow Engine
 *
 * A saga-style workflow orchestration engine built on Effect-TS with:
 * - Typed error handling
 * - Automatic compensation (rollback) on failure
 * - Retry policies with exponential backoff
 * - Step and workflow timeouts
 * - Distributed locking to prevent concurrent execution
 * - Structured logging via @damatjs/utils
 * - Workflow context propagation
 *
 * @packageDocumentation
 * @see workflow-engine.md for documentation
 */

// =============================================================================
// TYPES
// =============================================================================

export type {
  // Configuration
  RetryPolicy,
  StepConfig,
  RequiredStepConfig,
  WorkflowConfig,
  RequiredWorkflowConfig,
  // Context
  WorkflowContext,
  // Results
  WorkflowSuccess,
  WorkflowFailure,
  WorkflowResult,
  // Definitions
  StepDefinition,
  WorkflowDefinition,
  // Locking
  WorkflowLockConfig,
  WorkflowLockResult,
} from "./types";

// Re-export Effect types for convenience
export { Effect, Scope } from "./types";

// =============================================================================
// ERRORS
// =============================================================================

export {
  WorkflowError,
  StepExecutionError,
  StepTimeoutError,
  MaxRetriesExceededError,
  CompensationError,
  WorkflowLockError,
} from "./errors";

// =============================================================================
// CONFIGURATION
// =============================================================================

export {
  // Defaults
  DEFAULT_RETRY_POLICY,
  DEFAULT_STEP_CONFIG,
  DEFAULT_WORKFLOW_CONFIG,
  // Presets
  RetryPolicies,
  type RetryPolicyPreset,
} from "./config";

// =============================================================================
// LOGGER
// =============================================================================

export { getLogger, setLogger, clearLogger } from "./logger";

// =============================================================================
// LOCKING
// =============================================================================

export {
  initWorkflowLock,
  acquireWorkflowLock,
  releaseWorkflowLock,
  extendWorkflowLock,
  isWorkflowLocked,
} from "./lock";

// =============================================================================
// STEP
// =============================================================================

export { createStep, executeStep } from "./step";

// =============================================================================
// WORKFLOW
// =============================================================================

export { createWorkflow } from "./workflow";

// =============================================================================
// UTILITIES
// =============================================================================

export { runStep, skipStep, parallel, when, ifElse } from "./utils";
