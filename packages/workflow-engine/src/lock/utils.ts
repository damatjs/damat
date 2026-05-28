import { WORKFLOW_LOCK_PREFIX } from "./constants";

/**
 * Generate a lock key for a workflow.
 *
 * @param workflowName - Name of the workflow
 * @param lockId - Lock identifier
 * @returns Full lock key
 */
export function getLockKey(workflowName: string, lockId: string): string {
  return `${WORKFLOW_LOCK_PREFIX}${workflowName}:${lockId}`;
}

/**
 * Delay execution for a specified time.
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
