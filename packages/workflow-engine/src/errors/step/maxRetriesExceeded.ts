import { WorkflowError } from "../base";

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
