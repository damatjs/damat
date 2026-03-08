/**
 * Workflow Engine - Error Classes
 *
 * All error types used by the workflow engine.
 */

// =============================================================================
// BASE ERROR
// =============================================================================

/**
 * Base class for all workflow errors
 */
export class WorkflowError extends Error {
  readonly _tag: string = "WorkflowError";

  constructor(
    /** Error code for programmatic handling */
    public readonly code: string,
    /** Human-readable error message */
    message: string,
    /** Workflow name where error occurred */
    public readonly workflowName?: string,
    /** Step name where error occurred */
    public readonly stepName?: string,
    /** Original cause of the error */
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "WorkflowError";
  }
}

// =============================================================================
// STEP ERRORS
// =============================================================================

/**
 * Error thrown when a step fails execution
 */
export class StepExecutionError extends WorkflowError {
  override readonly _tag = "StepExecutionError";

  constructor(
    stepName: string,
    message: string,
    cause?: unknown,
    workflowName?: string,
  ) {
    super("STEP_EXECUTION_FAILED", message, workflowName, stepName, cause);
    this.name = "StepExecutionError";
  }
}

/**
 * Error thrown when a step times out
 */
export class StepTimeoutError extends WorkflowError {
  override readonly _tag = "StepTimeoutError";

  constructor(
    stepName: string,
    /** Timeout duration in milliseconds */
    public readonly timeoutMs: number,
    workflowName?: string,
  ) {
    super(
      "STEP_TIMEOUT",
      `Step '${stepName}' timed out after ${timeoutMs}ms`,
      workflowName,
      stepName,
    );
    this.name = "StepTimeoutError";
  }
}

/**
 * Error thrown when max retries are exhausted
 */
export class MaxRetriesExceededError extends WorkflowError {
  override readonly _tag = "MaxRetriesExceededError";

  constructor(
    stepName: string,
    /** Maximum number of retries attempted */
    public readonly maxRetries: number,
    /** The last error that occurred */
    lastError: unknown,
    workflowName?: string,
  ) {
    super(
      "MAX_RETRIES_EXCEEDED",
      `Step '${stepName}' failed after ${maxRetries} retries`,
      workflowName,
      stepName,
      lastError,
    );
    this.name = "MaxRetriesExceededError";
  }
}

// =============================================================================
// COMPENSATION ERRORS
// =============================================================================

/**
 * Error thrown when compensation (rollback) fails
 */
export class CompensationError extends WorkflowError {
  override readonly _tag = "CompensationError";

  constructor(
    stepName: string,
    message: string,
    cause?: unknown,
    workflowName?: string,
  ) {
    super("COMPENSATION_FAILED", message, workflowName, stepName, cause);
    this.name = "CompensationError";
  }
}

// =============================================================================
// LOCK ERRORS
// =============================================================================

/**
 * Error thrown when a workflow lock cannot be acquired
 */
export class WorkflowLockError extends WorkflowError {
  override readonly _tag = "WorkflowLockError";

  constructor(
    workflowName: string,
    /** Lock ID that was attempted */
    public readonly lockId: string,
  ) {
    super(
      "WORKFLOW_LOCKED",
      `Workflow '${workflowName}' is already running with lock ID '${lockId}'`,
      workflowName,
    );
    this.name = "WorkflowLockError";
  }
}
