import type { WorkflowError } from "../errors";

/**
 * Result type for successful workflow execution
 */
export interface WorkflowSuccess<T> {
  success: true;
  result: T;
  executionId: string;
  durationMs: number;
}

/**
 * Result type for failed workflow execution
 */
export interface WorkflowFailure {
  success: false;
  error: WorkflowError;
  executionId: string;
  durationMs: number;
  compensated: boolean;
}

/**
 * Union type for workflow execution result
 */
export type WorkflowResult<T> = WorkflowSuccess<T> | WorkflowFailure;
