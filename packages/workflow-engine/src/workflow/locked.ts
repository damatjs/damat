import { Effect, Scope } from "@damatjs/deps/effect";
import { nanoid } from "@damatjs/deps/nanoid";
import { createContextLogger } from "@damatjs/logger";
import type {
  RequiredWorkflowConfig,
  WorkflowContext,
  WorkflowExecutionOptions,
  WorkflowLockConfig,
  WorkflowResult,
} from "../types";
import type { WorkflowError } from "../errors";
import { executeWorkflowInternal } from "./execute";
import { acquireExecutionLock } from "./lock-acquire";
import { releaseExecutionLock, startLockHeartbeat } from "./lock-lifecycle";

export async function executeWorkflowWithLock<I, O>(
  name: string,
  definition: (
    input: I,
    ctx: WorkflowContext,
  ) => Effect.Effect<O, WorkflowError, Scope.Scope>,
  config: RequiredWorkflowConfig,
  input: I,
  lockConfig: WorkflowLockConfig,
  metadata: Record<string, unknown>,
  options: WorkflowExecutionOptions,
): Promise<WorkflowResult<O>> {
  const executionId = options.executionId ?? nanoid();
  const attempt = await acquireExecutionLock<O>(name, lockConfig, executionId);
  if ("failure" in attempt) return attempt.failure;
  const { lock } = attempt;
  const heartbeat = startLockHeartbeat(name, lock, lockConfig, executionId);
  const logger = createContextLogger({ workflow: name });
  try {
    logger.debug("Workflow lock acquired", {
      lockId: lock.lockId,
      executionId,
    });
    return await executeWorkflowInternal(
      name,
      definition,
      config,
      input,
      { ...metadata, lockId: lock.lockId },
      executionId,
      options,
    );
  } finally {
    if (heartbeat) clearInterval(heartbeat);
    await releaseExecutionLock(name, lock, executionId);
  }
}
