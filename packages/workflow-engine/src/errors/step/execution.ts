import { WorkflowError } from "../base";

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
