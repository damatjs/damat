import { releaseLock } from "@damatjs/redis";
import { createContextLogger } from "@damatjs/logger";
import { getLockKey } from "./utils";

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
  const logger = createContextLogger({ workflow: workflowName });

  const lockKey = getLockKey(workflowName, lockId);
  const released = await releaseLock(lockKey, lockValue);

  if (released) {
    logger.debug("Workflow lock released", { lockId });
  } else {
    logger.warn("Failed to release workflow lock (not held or expired)", {
      lockId,
    });
  }

  return released;
}
