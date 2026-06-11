import { Effect, Scope } from "effect";
import { nanoid } from "nanoid";
import type {
  WorkflowConfig,
  WorkflowDefinition,
  RequiredWorkflowConfig,
  WorkflowContext,
  WorkflowResult,
  WorkflowLockConfig,
} from "../types";
import { WorkflowError, WorkflowLockError } from "../errors";
import { DEFAULT_WORKFLOW_CONFIG, DEFAULT_STEP_CONFIG } from "../config";
import { createContextLogger } from "@damatjs/logger";
import {
  acquireWorkflowLock,
  releaseWorkflowLock,
  extendWorkflowLock,
} from "../lock";
import { DEFAULT_LOCK_TTL_MS } from "../lock/constants";
import { executeWorkflowInternal } from "./execute";

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
          compensationsFailed: 0,
        };
      }

      // The lockId is a business ID and repeats across runs — executionId
      // must stay unique per execution for tracing.
      const executionId = nanoid();

      // Optionally keep the lock alive while the workflow runs, so executions
      // longer than the TTL don't silently lose mutual exclusion.
      const ttlMs = lockConfig.ttlMs ?? DEFAULT_LOCK_TTL_MS;
      let heartbeat: ReturnType<typeof setInterval> | undefined;
      if (lockConfig.autoExtend && lock.lockValue) {
        heartbeat = setInterval(
          () => {
            extendWorkflowLock(name, lock.lockId, lock.lockValue!, ttlMs).then(
              (extended) => {
                if (!extended) {
                  workflowLogger.warn(
                    `Lock auto-extend failed — lock expired or taken over`,
                    { lockId: lock.lockId, executionId },
                  );
                }
              },
              () => {},
            );
          },
          Math.max(1000, Math.floor(ttlMs / 2)),
        );
      }

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
        if (heartbeat) {
          clearInterval(heartbeat);
        }
        // Always release lock
        if (lock.lockValue) {
          await releaseWorkflowLock(name, lock.lockId, lock.lockValue);
        }
      }
    },
  };
}
