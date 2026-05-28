/**
 * Execution context passed to steps
 */
export interface WorkflowContext {
  /** Unique execution ID for tracing */
  executionId: string;
  /** Workflow name */
  workflowName: string;
  /** Start timestamp */
  startedAt: Date;
  /** Current attempt number (for retries) */
  attempt: number;
  /** Metadata passed through the workflow */
  metadata: Record<string, unknown>;
}
