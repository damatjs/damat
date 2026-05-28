import { getRedis } from "@damatjs/redis";
import { getLockKey } from "./utils";

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
  const redis = getRedis();
  const lockKey = getLockKey(workflowName, lockId);
  const value = await redis.get(`lock:${lockKey}`);
  return value !== null;
}
