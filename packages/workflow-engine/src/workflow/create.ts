import { Effect, Scope } from "@damatjs/deps/effect";
import { nanoid } from "@damatjs/deps/nanoid";
import type {
  WorkflowConfig,
  WorkflowContext,
  WorkflowDefinition,
  WorkflowExecutionOptions,
  WorkflowLockConfig,
} from "../types";
import type { WorkflowError } from "../errors";
import { resolveWorkflowConfig } from "./config";
import { executeWorkflowInternal } from "./execute";
import { executeWorkflowWithLock } from "./locked";

export function createWorkflow<I, O>(
  name: string,
  definition: (
    input: I,
    ctx: WorkflowContext,
  ) => Effect.Effect<O, WorkflowError, Scope.Scope>,
  config: WorkflowConfig = {},
): WorkflowDefinition<I, O> {
  const resolved = resolveWorkflowConfig(config);
  return {
    name,
    config: resolved,
    execute: (input, metadata = {}, options = {}) =>
      executeWorkflowInternal(
        name,
        definition,
        resolved,
        input,
        metadata,
        options.executionId ?? nanoid(),
        options,
      ),
    executeWithLock: (
      input: I,
      lockConfig: WorkflowLockConfig = {},
      metadata: Record<string, unknown> = {},
      options: WorkflowExecutionOptions = {},
    ) =>
      executeWorkflowWithLock(
        name,
        definition,
        resolved,
        input,
        lockConfig,
        metadata,
        options,
      ),
  };
}
