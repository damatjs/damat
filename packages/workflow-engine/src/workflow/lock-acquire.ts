import { nanoid } from "@damatjs/deps/nanoid";
import { createContextLogger } from "@damatjs/logger";
import type { WorkflowLockConfig, WorkflowResult } from "../types";
import { WorkflowError, WorkflowLockError } from "../errors";
import { acquireWorkflowLock } from "../lock";

type AcquiredLock = Awaited<ReturnType<typeof acquireWorkflowLock>>;

export type ExecutionLockAttempt<O> =
  { lock: AcquiredLock } | { failure: WorkflowResult<O> };

function failure<O>(
  error: WorkflowError,
  executionId: string,
): WorkflowResult<O> {
  return {
    success: false,
    error,
    executionId,
    durationMs: 0,
    compensated: false,
    compensationsFailed: 0,
    compensationErrors: [],
  };
}

export async function acquireExecutionLock<O>(
  name: string,
  config: WorkflowLockConfig,
  executionId = nanoid(),
): Promise<ExecutionLockAttempt<O>> {
  const logger = createContextLogger({ workflow: name });
  let lock: AcquiredLock;
  try {
    lock = await acquireWorkflowLock(name, config);
  } catch (cause) {
    const errorCause =
      cause instanceof Error ? cause : new Error(String(cause));
    const error = new WorkflowError(
      "LOCK_BACKEND_UNAVAILABLE",
      `Workflow '${name}' could not acquire its lock: ${errorCause.message}`,
      name,
      undefined,
      errorCause,
    );
    logger.error("Workflow lock backend unavailable", errorCause, {
      lockId: config.lockId,
    });
    return { failure: failure(error, executionId) };
  }
  if (!lock.acquired) {
    logger.warn("Workflow lock not acquired", { lockId: lock.lockId });
    return {
      failure: failure(new WorkflowLockError(name, lock.lockId), executionId),
    };
  }
  return { lock };
}
