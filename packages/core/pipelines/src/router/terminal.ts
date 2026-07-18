import type { DurabilityExecutor } from "@damatjs/durability";
import { getPipelineJob, validatePipelineSchema } from "../definitions";
import { finishCompensation } from "./compensation";
import type { TerminalJobExecution } from "./claims";
import { loadPipelineRunRow } from "./load";
import {
  completeForwardNode,
  failForwardNode,
  serializePipelineError,
} from "./outcome";

export async function projectTerminalJob(
  executor: DurabilityExecutor,
  execution: TerminalJobExecution,
): Promise<void> {
  const run = await loadPipelineRunRow(executor, execution.run_id);
  const succeeded = execution.job_status === "succeeded";
  const error = execution.job_error ?? {
    name: execution.job_status === "cancelled" ? "JobCancelled" : "JobFailed",
    message: `Pipeline node job ended as ${execution.job_status}`,
  };
  if (execution.phase === "compensation") {
    await finishCompensation(
      executor,
      run,
      execution,
      succeeded,
      execution.job_result,
      succeeded ? undefined : error,
    );
    return;
  }
  const node = run.manifest.nodes.find(
    (value) => value.id === execution.node_id,
  );
  if (!node)
    throw new Error(
      `Pipeline node "${execution.node_id}" is missing from its pinned manifest`,
    );
  if (!succeeded) {
    await failForwardNode(executor, run, execution, node, error);
    return;
  }
  try {
    if (node.kind === "job")
      validatePipelineSchema(
        execution.job_result,
        getPipelineJob(node.name)?.outputSchema,
        `${node.name}.output`,
      );
    await completeForwardNode(executor, run, execution, execution.job_result);
  } catch (validationError) {
    await failForwardNode(
      executor,
      run,
      execution,
      node,
      serializePipelineError(validationError),
    );
  }
}
