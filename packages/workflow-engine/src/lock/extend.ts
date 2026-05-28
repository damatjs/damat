import { getRedis } from "@damatjs/redis";
import { createContextLogger } from "@damatjs/logger";
import { getLockKey } from "./utils";

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
  const redis = getRedis();
  const logger = createContextLogger({ workflow: workflowName });

  const lockKey = getLockKey(workflowName, lockId);

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
