import { WorkflowError } from "./base";

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
