import type { CompensationError, WorkflowError } from "../errors";

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
  /** True if at least one compensation function ran successfully */
  compensated: boolean;
  /** Number of compensation functions that threw (errors are logged, not raised) */
  compensationsFailed: number;
  /** The errors from failed compensations, in occurrence order (empty when none failed) */
  compensationErrors: CompensationError[];
}

/**
 * Union type for workflow execution result
 */
export type WorkflowResult<T> = WorkflowSuccess<T> | WorkflowFailure;
