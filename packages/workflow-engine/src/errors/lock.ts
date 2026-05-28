import { WorkflowError } from "./base";

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
