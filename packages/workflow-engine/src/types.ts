/**
 * Workflow Engine - Type Definitions
 *
 * All interfaces and type definitions for the workflow engine.
 */

import { Effect, Scope } from "effect";
import type { WorkflowError } from "./errors";

// =============================================================================
// RETRY POLICY
// =============================================================================

/**
 * Retry policy configuration for steps
 */
export interface RetryPolicy {
  /** Maximum number of retry attempts (0 = no retries) */
  maxAttempts: number;
  /** Initial delay between retries in milliseconds */
  initialDelayMs: number;
  /** Maximum delay between retries in milliseconds */
  maxDelayMs: number;
  /** Backoff multiplier (e.g., 2 for exponential backoff) */
  backoffMultiplier: number;
  /** Optional predicate to determine if error is retryable */
  isRetryable?: (error: unknown) => boolean;
}

// =============================================================================
// STEP CONFIGURATION
// =============================================================================

/**
 * Step configuration options
 */
export interface StepConfig {
  /** Step timeout in milliseconds (default: 30000) */
  timeoutMs?: number;
  /** Retry policy (default: no retries) */
  retry?: Partial<RetryPolicy>;
  /** Whether this step is idempotent (safe to retry) */
  idempotent?: boolean;
  /** Custom description for logging */
  description?: string;
}

/**
 * Required step configuration (with defaults applied)
 */
export interface RequiredStepConfig {
  timeoutMs: number;
  retry: RetryPolicy;
  idempotent: boolean;
  description: string;
}

// =============================================================================
// WORKFLOW CONFIGURATION
// =============================================================================

/**
 * Workflow configuration options
 */
export interface WorkflowConfig {
  /** Overall workflow timeout in milliseconds (default: 300000 = 5 min) */
  timeoutMs?: number;
  /** Default step configuration */
  defaultStepConfig?: StepConfig;
}

/**
 * Required workflow configuration (with defaults applied)
 */
export interface RequiredWorkflowConfig {
  timeoutMs: number;
  defaultStepConfig: RequiredStepConfig;
}

// =============================================================================
// WORKFLOW CONTEXT
// =============================================================================

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

// =============================================================================
// WORKFLOW RESULTS
// =============================================================================

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

// =============================================================================
// STEP DEFINITION
// =============================================================================

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

// =============================================================================
// WORKFLOW DEFINITION
// =============================================================================

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

// =============================================================================
// LOCKING
// =============================================================================

/**
 * Configuration for workflow locking
 */
export interface WorkflowLockConfig {
  /**
   * Unique identifier for the lock.
   * Use a business ID (e.g., orderId, userId) to prevent concurrent
   * processing of the same entity.
   * If not provided, a random ID is generated (unique per execution).
   */
  lockId?: string;
  /**
   * Lock TTL in milliseconds.
   * Should be longer than the expected workflow duration.
   * Default: 300000 (5 minutes)
   */
  ttlMs?: number;
  /**
   * Maximum retries to acquire the lock.
   * Default: 0 (no retries, fail immediately if locked)
   */
  maxRetries?: number;
  /**
   * Delay between lock acquisition retries in milliseconds.
   * Default: 100
   */
  retryDelayMs?: number;
}

/**
 * Result of a workflow lock acquisition attempt
 */
export interface WorkflowLockResult {
  /** Whether the lock was acquired */
  acquired: boolean;
  /** Lock identifier used */
  lockId: string;
  /** Lock value (needed for release) - only set if acquired */
  lockValue?: string;
  /** Full lock key */
  lockKey: string;
}

// =============================================================================
// LOGGER INTERFACE
// =============================================================================

/**
 * Logger interface for workflow engine
 * Compatible with ILogger from @damatjs/utils
 */
export interface WorkflowLogger {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(
    message: string,
    error: unknown,
    context?: Record<string, unknown>,
  ): void;
  child(context: Record<string, unknown>): WorkflowLogger;
}

// =============================================================================
// RE-EXPORTS FROM EFFECT
// =============================================================================

export { Effect, Scope };
