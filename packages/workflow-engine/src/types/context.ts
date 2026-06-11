import type { StepConfig } from "./step";

/**
 * Engine-internal bookkeeping carried through the context.
 * @internal
 */
export interface WorkflowEngineState {
  /** Number of compensation functions that have executed */
  compensationsRun: number;
  /** Number of compensation functions that threw */
  compensationsFailed: number;
  /** Workflow-level step defaults, layered under each step's own config */
  defaultStepConfig?: StepConfig;
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
