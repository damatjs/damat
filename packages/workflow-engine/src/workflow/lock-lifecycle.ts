import { createContextLogger } from "@damatjs/logger";
import type { WorkflowLockConfig } from "../types";
import { extendWorkflowLock, releaseWorkflowLock } from "../lock";
import { DEFAULT_AUTO_EXTEND, DEFAULT_LOCK_TTL_MS } from "../lock/constants";

interface HeldLock {
  lockId: string;
  lockValue?: string;
}

export function startLockHeartbeat(
  name: string,
  lock: HeldLock,
  config: WorkflowLockConfig,
  executionId: string,
) {
  if (!(config.autoExtend ?? DEFAULT_AUTO_EXTEND) || !lock.lockValue) return;
  const ttlMs = config.ttlMs ?? DEFAULT_LOCK_TTL_MS;
  const logger = createContextLogger({ workflow: name });
  return setInterval(
    () => {
      extendWorkflowLock(name, lock.lockId, lock.lockValue!, ttlMs).then(
        (extended) => {
          if (!extended) {
            logger.warn("Workflow lock expired or was taken over", {
              lockId: lock.lockId,
              executionId,
            });
          }
        },
        () => {},
      );
    },
    Math.max(1000, Math.floor(ttlMs / 2)),
  );
}

export async function releaseExecutionLock(
  name: string,
  lock: HeldLock,
  executionId: string,
): Promise<void> {
  if (!lock.lockValue) return;
  try {
    await releaseWorkflowLock(name, lock.lockId, lock.lockValue);
  } catch (cause) {
    createContextLogger({ workflow: name }).error(
      "Failed to release workflow lock; it will expire via TTL",
      cause instanceof Error ? cause : new Error(String(cause)),
      { lockId: lock.lockId, executionId },
    );
  }
}
