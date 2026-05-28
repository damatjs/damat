import { WorkflowError } from "../base";

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
