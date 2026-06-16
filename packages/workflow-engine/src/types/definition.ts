import type { RequiredStepConfig, StepConfig } from "./step";
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
  /**
   * The config exactly as passed to createStep (no defaults applied).
   * Lets the engine layer workflow-level defaults under step-level overrides.
   */
  rawConfig?: StepConfig;
  /**
   * Main step execution function.
   * The signal aborts on step timeout or workflow interruption — pass it to
   * fetch/db calls so cancelled work actually stops.
   */
  invoke: (input: I, ctx: WorkflowContext, signal?: AbortSignal) => Promise<O>;
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
