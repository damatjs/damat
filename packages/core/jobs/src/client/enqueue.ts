import {
  getDurabilityClient,
  isTransactionalExecutor,
  TransactionalExecutorRequiredError,
  type DurabilityExecutor,
  recordAccelerationSignal,
} from "@damatjs/durability";
import type { JobName, JobPayload } from "../definitions/types";
import { validateEnqueue } from "../validation/enqueue";
import { publishJobWakeup } from "../wakeup/publisher";
import { requireDeduplicatedRun } from "./deduplication-result";
import {
  appendJobActivity,
  claimJobDeduplication,
  findJobRun,
  insertJobRun,
  type EnqueueJobOptions,
  type JobRun,
} from "../repositories";
import { resolveJobRun } from "./resolve-enqueue";

export async function enqueueJob<K extends JobName>(
  name: K,
  payload: JobPayload<K>,
  options: EnqueueJobOptions = {},
): Promise<JobRun> {
  validateEnqueue(name, options);
  if (options.executor) {
    if (!isTransactionalExecutor(options.executor)) {
      throw new TransactionalExecutorRequiredError();
    }
    return enqueueWith(options.executor, name, payload, options);
  }
  const run = await getDurabilityClient().transaction((executor) =>
    enqueueWith(executor, name, payload, options),
  );
  await publishJobWakeup(run.queue);
  return run;
}

async function enqueueWith(
  executor: DurabilityExecutor,
  name: string,
  payload: unknown,
  options: EnqueueJobOptions,
): Promise<JobRun> {
  const run = resolveJobRun(name, payload, options);
  if (options.deduplication) {
    const claim = await claimJobDeduplication(executor, {
      queue: run.queue,
      name,
      key: options.deduplication.key,
      runId: run.id,
      ...(options.deduplication.expiresAt
        ? { expiresAt: options.deduplication.expiresAt }
        : {}),
    });
    if (!claim.acquired) {
      const existing = await findJobRun(claim.runId, executor);
      return requireDeduplicatedRun(existing, claim.runId);
    }
  }
  const inserted = await insertJobRun(executor, run);
  await appendJobActivity(executor, {
    runId: inserted.id,
    type: "enqueued",
    nextStatus: "queued",
  });
  await recordAccelerationSignal({
    topic: "damat:jobs:wakeup",
    kind: "job",
    resourceId: inserted.id,
    scope: inserted.queue,
    payload: { kind: "jobs", queue: inserted.queue },
    availableAt: inserted.availableAt,
    executor,
  });
  return inserted;
}
