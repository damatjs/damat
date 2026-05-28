import type { RequiredStepConfig } from "./step";
import type { RequiredWorkflowConfig } from "./workflow";
import type { WorkflowResult } from "./result";
import type { WorkflowLockConfig } from "./lock";
import { WorkflowContext } from './context';

/**
 * Step definition with typed input/output
 */
export interface StepDefinition<I, O> {
  /** Unique step name for logging and tracing */
  name: string;
  /** Step configuration with defaults applied */
  config: RequiredStepConfig;
  /** Main step execution function */
  invoke: (input: I, ctx: WorkflowContext) => Promise<O>;
  /** Optional rollback function called on workflow failure */
  compensate?: (input: I, output: O, ctx: WorkflowContext) => Promise<void>;
}

// Re-export WorkflowContext for convenience
export type { WorkflowContext } from "./context";

/**
 * Workflow definition with typed input/output
 */
export interface WorkflowDefinition<I, O> {
  /** Unique workflow name for logging and tracing */
  name: string;
  /** Workflow configuration with defaults applied */
  config: RequiredWorkflowConfig;
  /** Execute the workflow with the given input */
  execute: (
    input: I,
    metadata?: Record<string, unknown>,
  ) => Promise<WorkflowResult<O>>;
  /** Execute the workflow with a distributed lock */
  executeWithLock: (
    input: I,
    lockConfig?: WorkflowLockConfig,
    metadata?: Record<string, unknown>,
  ) => Promise<WorkflowResult<O>>;
}
