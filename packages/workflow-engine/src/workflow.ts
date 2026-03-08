/**
 * Workflow Engine - Workflow
 *
 * Workflow creation and execution with timeout, compensation, and locking support.
 */

import { Effect, Scope, Exit, Cause, Duration } from "effect";
import { nanoid } from "nanoid";
import type {
  WorkflowConfig,
  WorkflowDefinition,
  RequiredWorkflowConfig,
  WorkflowContext,
  WorkflowResult,
  WorkflowLockConfig,
} from "./types";
import { WorkflowError, WorkflowLockError } from "./errors";
import { DEFAULT_WORKFLOW_CONFIG, DEFAULT_STEP_CONFIG } from "./config";
import { createContextLogger } from "./logger";
import { acquireWorkflowLock, releaseWorkflowLock } from "./lock";

// =============================================================================
// INTERNAL EXECUTION
// =============================================================================

/**
 * Internal workflow execution logic.
 */
async function executeWorkflowInternal<I, O>(
  name: string,
  definition: (
    input: I,
    ctx: WorkflowContext,
  ) => Effect.Effect<O, WorkflowError, Scope.Scope>,
  mergedConfig: RequiredWorkflowConfig,
  input: I,
  metadata: Record<string, unknown>,
  executionId: string,
): Promise<WorkflowResult<O>> {
  const workflowLogger = createContextLogger({ workflow: name });
  const startedAt = new Date();
  const startTime = Date.now();

  const ctx: WorkflowContext = {
    executionId,
    workflowName: name,
    startedAt,
    attempt: 1,
    metadata,
  };

  workflowLogger.info(`Starting workflow execution`, {
    executionId,
    input: JSON.stringify(input),
  });

  // Wrap the workflow definition with timeout
  const workflowEffect = Effect.timeoutFail(
    Effect.scoped(definition(input, ctx)),
    {
      duration: Duration.millis(mergedConfig.timeoutMs),
      onTimeout: () =>
        new WorkflowError(
          "WORKFLOW_TIMEOUT",
          `Workflow '${name}' timed out after ${mergedConfig.timeoutMs}ms`,
          name,
        ),
    },
  );

  const exit = await Effect.runPromiseExit(workflowEffect);
  const durationMs = Date.now() - startTime;

  if (Exit.isSuccess(exit)) {
    workflowLogger.info(`Workflow completed successfully`, {
      executionId,
      durationMs,
    });

    return {
      success: true,
      result: exit.value,
      executionId,
      durationMs,
    };
  } else {
    const rawError = Cause.squash(exit.cause);
    const error =
      rawError instanceof WorkflowError
        ? rawError
        : new WorkflowError(
            "WORKFLOW_FAILED",
            rawError instanceof Error ? rawError.message : String(rawError),
            name,
            undefined,
            rawError,
          );

    workflowLogger.error(`Workflow failed`, error, {
      executionId,
      durationMs,
      errorCode: error.code,
    });

    return {
      success: false,
      error,
      executionId,
      durationMs,
      compensated: true, // Effect's scoped finalizers handle compensation
    };
  }
}

// =============================================================================
// WORKFLOW CREATION
// =============================================================================

/**
 * Creates a workflow with typed input/output.
 *
 * @param name - Unique workflow name for logging and tracing
 * @param definition - Workflow implementation using Effect generators
 * @param config - Workflow configuration (timeout, etc.)
 * @returns Workflow definition object with execute and executeWithLock methods
 *
 * @example
 * ```typescript
 * const orderWorkflow = createWorkflow(
 *   'process-order',
 *   (input: OrderInput, ctx) =>
 *     Effect.gen(function* (_) {
 *       // Validate order
 *       const validated = yield* executeStep(validateStep, input, ctx);
 *
 *       // Create order (with compensation)
 *       const order = yield* executeStep(createOrderStep, validated, ctx);
 *
 *       // Process payment (with compensation)
 *       const payment = yield* executeStep(paymentStep, { orderId: order.id }, ctx);
 *
 *       // Send confirmation (no compensation needed)
 *       yield* executeStep(notifyStep, { order, payment }, ctx);
 *
 *       return { order, payment };
 *     }),
 *   { timeoutMs: 60000 }
 * );
 *
 * // Execute without lock
 * const result = await orderWorkflow.execute({ items: [...], userId: '123' });
 *
 * // Execute with lock (prevents concurrent processing of same order)
 * const result = await orderWorkflow.executeWithLock(
 *   { items: [...], userId: '123' },
 *   { lockId: orderId, ttlMs: 60000 }
 * );
 * ```
 */
export function createWorkflow<I, O>(
  name: string,
  definition: (
    input: I,
    ctx: WorkflowContext,
  ) => Effect.Effect<O, WorkflowError, Scope.Scope>,
  config: WorkflowConfig = {},
): WorkflowDefinition<I, O> {
  const mergedConfig: RequiredWorkflowConfig = {
    ...DEFAULT_WORKFLOW_CONFIG,
    ...config,
    defaultStepConfig: {
      ...DEFAULT_STEP_CONFIG,
      ...config.defaultStepConfig,
      retry: {
        ...DEFAULT_STEP_CONFIG.retry,
        ...config.defaultStepConfig?.retry,
      },
    },
  };

  return {
    name,
    config: mergedConfig,

    /**
     * Execute the workflow without locking.
     */
    execute: async (
      input: I,
      metadata: Record<string, unknown> = {},
    ): Promise<WorkflowResult<O>> => {
      const executionId = nanoid();
      return executeWorkflowInternal(
        name,
        definition,
        mergedConfig,
        input,
        metadata,
        executionId,
      );
    },

    /**
     * Execute the workflow with a distributed lock.
     * Prevents concurrent execution of workflows with the same lock ID.
     *
     * @param input - Workflow input
     * @param lockConfig - Lock configuration (lockId, ttlMs, maxRetries)
     * @param metadata - Optional metadata
     * @returns Workflow result
     * @throws WorkflowLockError if lock cannot be acquired
     *
     * @example
     * ```typescript
     * // Use order ID as lock to prevent duplicate processing
     * const result = await orderWorkflow.executeWithLock(
     *   orderInput,
     *   { lockId: orderId, ttlMs: 120000 }
     * );
     * ```
     */
    executeWithLock: async (
      input: I,
      lockConfig: WorkflowLockConfig = {},
      metadata: Record<string, unknown> = {},
    ): Promise<WorkflowResult<O>> => {
      const workflowLogger = createContextLogger({ workflow: name });

      // Acquire lock
      const lock = await acquireWorkflowLock(name, lockConfig);

      if (!lock.acquired) {
        const error = new WorkflowLockError(name, lock.lockId);
        workflowLogger.warn(`Workflow lock not acquired`, {
          lockId: lock.lockId,
        });

        return {
          success: false,
          error,
          executionId: nanoid(),
          durationMs: 0,
          compensated: false,
        };
      }

      // Use lockId as executionId for traceability
      const executionId = lock.lockId;

      try {
        workflowLogger.debug(`Workflow lock acquired`, {
          lockId: lock.lockId,
          executionId,
        });

        return await executeWorkflowInternal(
          name,
          definition,
          mergedConfig,
          input,
          { ...metadata, lockId: lock.lockId },
          executionId,
        );
      } finally {
        // Always release lock
        if (lock.lockValue) {
          await releaseWorkflowLock(name, lock.lockId, lock.lockValue);
        }
      }
    },
  };
}
