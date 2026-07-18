import type { Effect, Scope } from "@damatjs/deps/effect";
import type { RequiredStepConfig, StepConfig } from "./step";
import type { RequiredWorkflowConfig } from "./workflow";
import type { WorkflowResult } from "./result";
import type { WorkflowLockConfig } from "./lock";
import type { WorkflowError } from "../errors";
import type { StepResponse } from "../step/response";
import { WorkflowContext } from "./context";

/**
 * Step definition with typed input/output.
 *
 * A step is also **callable**: `step(input, ctx)` is sugar for
 * `executeStep(step, input, ctx)` and returns the Effect, so a workflow body
 * can be written as `(input, ctx) => step(input, ctx)` (single step) or
 * `yield* step(input, ctx)` (inside `Effect.gen`) — no `executeStep` noise.
 *
 * Per-call overrides are optional and layer **on top** of the step's own config
 * (and any workflow-level defaults): `step(input, ctx, { timeoutMs: 10_000 })`
 * or `step(input, ctx, { retry: { maxAttempts: 5 } })`. Omit the third argument
 * to keep the step's configured timeout/retry as-is.
 *
 * `C` is the compensation payload type — the value `invoke` puts in the second
 * slot of its `StepResponse` and that `compensate` receives. It defaults to
 * `undefined` (no rollback data).
 */
export interface StepDefinition<I, O, C = undefined> {
  (
    input: I,
    ctx: WorkflowContext,
    overrideConfig?: StepConfig,
  ): Effect.Effect<O, WorkflowError, Scope.Scope>;
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
   * Main step execution function. Returns a {@link StepResponse} carrying the
   * step's `output` (delivered downstream) and an optional `compensateInput`
   * (delivered to `compensate`).
   * The signal aborts on step timeout or workflow interruption — pass it to
   * fetch/db calls so cancelled work actually stops.
   */
  invoke: (
    input: I,
    ctx: WorkflowContext,
    signal?: AbortSignal,
  ) => Promise<StepResponse<O, C>>;
  /**
   * Optional rollback function called on workflow failure. Receives ONLY the
   * `compensateInput` captured by the forward step (or `undefined` when none was
   * provided — there is no fallback to the output) plus the workflow context.
   */
  compensate?: (compensateInput: C, ctx: WorkflowContext) => Promise<void>;
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
    options?: import("./observer").WorkflowExecutionOptions,
  ) => Promise<WorkflowResult<O>>;
  /** Execute the workflow with a distributed lock */
  executeWithLock: (
    input: I,
    lockConfig?: WorkflowLockConfig,
    metadata?: Record<string, unknown>,
    options?: import("./observer").WorkflowExecutionOptions,
  ) => Promise<WorkflowResult<O>>;
}
