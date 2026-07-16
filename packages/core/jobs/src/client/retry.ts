import {
  getDurabilityClient,
  isTransactionalExecutor,
  TransactionalExecutorRequiredError,
  type DurabilityExecutor,
} from "@damatjs/durability";
import {
  appendJobActivity,
  transitionJobRun,
  type JobRun,
} from "../repositories";

export interface RetryJobRunOptions {
  actor?: Record<string, unknown>;
  executor?: DurabilityExecutor;
}

export async function retryJobRun(
  id: string,
  options: RetryJobRunOptions = {},
): Promise<JobRun | undefined> {
  const execute = (executor: DurabilityExecutor) =>
    retryWith(executor, id, options);
  if (!options.executor) return getDurabilityClient().transaction(execute);
  if (!isTransactionalExecutor(options.executor)) {
    throw new TransactionalExecutorRequiredError();
  }
  return execute(options.executor);
}

async function retryWith(
  executor: DurabilityExecutor,
  id: string,
  options: RetryJobRunOptions,
): Promise<JobRun | undefined> {
  const run = await transitionJobRun(executor, id, ["dead_lettered"], "queued");
  if (!run) return undefined;
  await appendJobActivity(executor, {
    runId: id,
    type: "manual_retry",
    previousStatus: "dead_lettered",
    nextStatus: "queued",
    ...(options.actor ? { actor: options.actor } : {}),
  });
  return run;
}
