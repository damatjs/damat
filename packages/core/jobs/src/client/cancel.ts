import {
  getDurabilityClient,
  isTransactionalExecutor,
  TransactionalExecutorRequiredError,
  type DurabilityExecutor,
} from "@damatjs/durability";
import {
  appendJobActivity,
  lockJobRun,
  requestJobCancellation,
  transitionJobRun,
  type JobRun,
} from "../repositories";

export interface CancelJobRunOptions {
  reason?: string;
  actor?: Record<string, unknown>;
  executor?: DurabilityExecutor;
}

export async function cancelJobRun(
  id: string,
  options: CancelJobRunOptions = {},
): Promise<JobRun | undefined> {
  const execute = (executor: DurabilityExecutor) =>
    cancelWith(executor, id, options);
  if (!options.executor) return getDurabilityClient().transaction(execute);
  if (!isTransactionalExecutor(options.executor)) {
    throw new TransactionalExecutorRequiredError();
  }
  return execute(options.executor);
}

async function cancelWith(
  executor: DurabilityExecutor,
  id: string,
  options: CancelJobRunOptions,
): Promise<JobRun | undefined> {
  const current = await lockJobRun(executor, id);
  if (!current) return undefined;
  if (current.status === "running" && current.cancellationRequestedAt) {
    return current;
  }
  const cancellable =
    current.status === "queued" || current.status === "retry_wait";
  const cancelled = cancellable
    ? await transitionJobRun(executor, id, [current.status], "cancelled")
    : undefined;
  const run =
    cancelled ??
    (current.status === "running"
      ? await requestJobCancellation(executor, id)
      : undefined);
  if (!run) return undefined;
  await appendJobActivity(executor, {
    runId: id,
    type: cancelled ? "cancelled" : "cancellation_requested",
    previousStatus: current.status,
    nextStatus: run.status,
    ...(options.reason ? { reason: options.reason } : {}),
    ...(options.actor ? { actor: options.actor } : {}),
  });
  return run;
}
