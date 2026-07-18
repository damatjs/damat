import type { DurabilityExecutor } from "@damatjs/durability";
import type { PipelineTaskNode } from "../definitions";
import {
  markPipelineRunTerminal,
  type NodeExecutionRow,
  type RunRow,
} from "../repositories";
import { dispatchTask } from "./task";
import { finishNode } from "./update";
import { scheduleNextCompensation } from "./compensation-schedule";

export { scheduleNextCompensation } from "./compensation-schedule";

export async function beginCompensation(
  executor: DurabilityExecutor,
  run: RunRow,
  error: Record<string, unknown>,
): Promise<void> {
  await executor.query(
    `UPDATE "_damat_pipeline_runs" SET "status"='compensating',"error"=$2::jsonb,
       "updated_at"=NOW() WHERE "id"=$1`,
    [run.id, JSON.stringify(error)],
  );
  await scheduleNextCompensation(executor, run, error);
}

export async function dispatchCompensation(
  executor: DurabilityExecutor,
  run: RunRow,
  execution: NodeExecutionRow,
): Promise<string> {
  const node = run.manifest.nodes.find(
    (value) => value.id === execution.node_id,
  )!;
  const reference = node.compensateWith!;
  const task = { id: node.id, ...reference } as PipelineTaskNode;
  return dispatchTask(executor, run, execution, task, execution.input);
}

export async function finishCompensation(
  executor: DurabilityExecutor,
  run: RunRow,
  execution: NodeExecutionRow,
  succeeded: boolean,
  output?: unknown,
  error?: Record<string, unknown>,
): Promise<void> {
  if (!succeeded) {
    await finishNode(
      executor,
      execution,
      "compensation_failed",
      undefined,
      error,
    );
    await markPipelineRunTerminal(
      executor,
      run.id,
      "compensation_failed",
      undefined,
      {
        name: "CompensationFailed",
        message: "Pipeline compensation failed",
        original: run.error ?? null,
        compensation: error ?? null,
      },
    );
    return;
  }
  await finishNode(executor, execution, "compensated", output);
  await scheduleNextCompensation(executor, run, error);
}
