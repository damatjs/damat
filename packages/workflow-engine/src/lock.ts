/**
 * Workflow Engine - Distributed Locking
 *
 * Provides workflow-level locking to prevent concurrent execution
 * of workflows with the same lock ID.
 */

import type { Redis } from "@damatjs/utils";
import { acquireLock, releaseLock } from "@damatjs/utils";
import { nanoid } from "nanoid";
import type { WorkflowLockConfig, WorkflowLockResult } from "./types";
import { createContextLogger } from "./logger";

// =============================================================================
// DEFAULTS
// =============================================================================

/** Default lock TTL: 5 minutes */
const DEFAULT_LOCK_TTL_MS = 300_000;

/** Default lock retry delay: 100ms */
const DEFAULT_RETRY_DELAY_MS = 100;

/** Default max lock retries: 0 (no retries) */
const DEFAULT_MAX_RETRIES = 0;

/** Lock key prefix for workflow locks */
const WORKFLOW_LOCK_PREFIX = "workflow-lock:";

// =============================================================================
// LOCK MANAGER
// =============================================================================

/**
 * Workflow lock manager instance.
 * Must be initialized with a Redis client before using locked workflows.
 */
let redisClient: Redis | null = null;

/**
 * Initialize the workflow lock manager with a Redis client.
 *
 * @param client - Redis client instance
 *
 * @example
 * ```typescript
 * import { initWorkflowLock } from '@damatjs/workflow-engine';
 * import { createRedis } from '@damatjs/utils';
 *
 * const redis = createRedis({ url: process.env.REDIS_URL });
 * initWorkflowLock(redis);
 * ```
 */
export function initWorkflowLock(client: Redis): void {
  redisClient = client;
}

/**
 * Get the current Redis client for locking.
 * Throws if not initialized.
 *
 * @internal
 */
export function getRedisClient(): Redis {
  if (!redisClient) {
    throw new Error(
      "Workflow lock not initialized. Call initWorkflowLock(redis) first.",
    );
  }
  return redisClient;
}

/**
 * Clear the Redis client (for testing).
 *
 * @internal
 */
export function clearWorkflowLock(): void {
  redisClient = null;
}

// =============================================================================
// LOCK OPERATIONS
// =============================================================================

/**
 * Generate a lock key for a workflow.
 *
 * @param workflowName - Name of the workflow
 * @param lockId - Lock identifier
 * @returns Full lock key
 */
function getLockKey(workflowName: string, lockId: string): string {
  return `${WORKFLOW_LOCK_PREFIX}${workflowName}:${lockId}`;
}

/**
 * Delay execution for a specified time.
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
  const redis = getRedisClient();
  const logger = createContextLogger({ workflow: workflowName });

  const lockId = config.lockId ?? nanoid();
  const ttlMs = config.ttlMs ?? DEFAULT_LOCK_TTL_MS;
  const maxRetries = config.maxRetries ?? DEFAULT_MAX_RETRIES;
  const retryDelayMs = config.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;

  const lockKey = getLockKey(workflowName, lockId);
  let attempt = 0;

  while (attempt <= maxRetries) {
    const lockValue = await acquireLock(redis, lockKey, ttlMs);

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

/**
 * Release a workflow lock.
 *
 * @param workflowName - Name of the workflow
 * @param lockId - Lock identifier
 * @param lockValue - Lock value from acquireWorkflowLock
 * @returns true if released, false if lock was not held
 */
export async function releaseWorkflowLock(
  workflowName: string,
  lockId: string,
  lockValue: string,
): Promise<boolean> {
  const redis = getRedisClient();
  const logger = createContextLogger({ workflow: workflowName });

  const lockKey = getLockKey(workflowName, lockId);
  const released = await releaseLock(redis, lockKey, lockValue);

  if (released) {
    logger.debug("Workflow lock released", { lockId });
  } else {
    logger.warn("Failed to release workflow lock (not held or expired)", {
      lockId,
    });
  }

  return released;
}

/**
 * Extend a workflow lock's TTL.
 * Useful for long-running workflows that need more time.
 *
 * @param workflowName - Name of the workflow
 * @param lockId - Lock identifier
 * @param lockValue - Lock value from acquireWorkflowLock
 * @param ttlMs - New TTL in milliseconds
 * @returns true if extended, false if lock was not held
 */
export async function extendWorkflowLock(
  workflowName: string,
  lockId: string,
  lockValue: string,
  ttlMs: number,
): Promise<boolean> {
  const redis = getRedisClient();
  const logger = createContextLogger({ workflow: workflowName });

  const lockKey = getLockKey(workflowName, lockId);

  // Use Lua script for atomic check-and-extend
  const script = `
    if redis.call("get", KEYS[1]) == ARGV[1] then
      return redis.call("pexpire", KEYS[1], ARGV[2])
    else
      return 0
    end
  `;

  const result = await redis.eval(
    script,
    1,
    `lock:${lockKey}`,
    lockValue,
    ttlMs.toString(),
  );

  const extended = result === 1;

  if (extended) {
    logger.debug("Workflow lock extended", { lockId, ttlMs });
  } else {
    logger.warn("Failed to extend workflow lock (not held or expired)", {
      lockId,
    });
  }

  return extended;
}

/**
 * Check if a workflow lock is currently held.
 *
 * @param workflowName - Name of the workflow
 * @param lockId - Lock identifier
 * @returns true if lock is held
 */
export async function isWorkflowLocked(
  workflowName: string,
  lockId: string,
): Promise<boolean> {
  const redis = getRedisClient();
  const lockKey = getLockKey(workflowName, lockId);
  const value = await redis.get(`lock:${lockKey}`);
  return value !== null;
}
