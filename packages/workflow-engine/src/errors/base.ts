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
