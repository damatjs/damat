import type { StepConfig } from "./step";
import type { CompensationError, MaxRetriesExceededError } from "../errors";
import type { WorkflowExecutionObserver } from "./observer";

/**
 * Engine-internal bookkeeping carried through the context.
 * @internal
 */
export interface WorkflowEngineState {
  /** Number of compensation functions that have executed */
  compensationsRun: number;
  /** Number of compensation functions that threw */
  compensationsFailed: number;
  /**
   * The errors thrown by failed compensation functions, in the order they
   * occurred. Compensation failures never cascade (the workflow's original
   * error stands); this preserves them for the workflow result.
   */
  compensationErrors?: CompensationError[];
  /** Workflow-level step defaults, layered under each step's own config */
  defaultStepConfig?: StepConfig;
  /**
   * Set by a step whose retries were exhausted. The step still fails with its
   * last StepExecutionError/StepTimeoutError; the workflow surfaces this as the
   * result error so callers see MAX_RETRIES_EXCEEDED. @internal
   */
  retriesExceeded?: MaxRetriesExceededError;
  /** Optional execution telemetry sink used by durable pipeline adapters. */
  observer?: WorkflowExecutionObserver;
}

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
  /** Engine bookkeeping — do not read or mutate from steps. @internal */
  engineState?: WorkflowEngineState;
}
