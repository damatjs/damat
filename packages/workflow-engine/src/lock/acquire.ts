import { acquireLock } from "@damatjs/redis";
import { nanoid } from "nanoid";
import type { WorkflowLockConfig, WorkflowLockResult } from "../types";
import { createContextLogger } from "@damatjs/logger";
import {
  DEFAULT_LOCK_TTL_MS,
  DEFAULT_RETRY_DELAY_MS,
  DEFAULT_MAX_RETRIES,
} from "./constants";
import { getLockKey, delay } from "./utils";

/**
 * Attempt to acquire a workflow lock with optional retries.
 *
 * @param workflowName - Name of the workflow
 * @param config - Lock configuration
 * @returns Lock result with lockId and lockValue if acquired
 *
 * @example
 * ```typescript
 * const lock = await acquireWorkflowLock('process-order', {
 *   lockId: orderId,
 *   ttlMs: 60000,
 *   maxRetries: 3,
 * });
 *
 * if (!lock.acquired) {
 *   throw new Error('Workflow already running');
 * }
 * ```
 */
export async function acquireWorkflowLock(
  workflowName: string,
  config: WorkflowLockConfig = {},
): Promise<WorkflowLockResult> {
  const logger = createContextLogger({ workflow: workflowName });

  const lockId = config.lockId ?? nanoid();
  const ttlMs = config.ttlMs ?? DEFAULT_LOCK_TTL_MS;
  const maxRetries = config.maxRetries ?? DEFAULT_MAX_RETRIES;
  const retryDelayMs = config.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;

  const lockKey = getLockKey(workflowName, lockId);
  let attempt = 0;

  while (attempt <= maxRetries) {
    const lockValue = await acquireLock(lockKey, ttlMs);

    if (lockValue) {
      logger.debug("Workflow lock acquired", { lockId, attempt });
      return {
        acquired: true,
        lockId,
        lockValue,
        lockKey,
      };
    }

    attempt++;

    if (attempt <= maxRetries) {
      logger.debug("Lock acquisition failed, retrying", {
        lockId,
        attempt,
        maxRetries,
      });
      await delay(retryDelayMs);
    }
  }

  logger.warn("Failed to acquire workflow lock", { lockId, maxRetries });
  return {
    acquired: false,
    lockId,
    lockKey,
  };
}
