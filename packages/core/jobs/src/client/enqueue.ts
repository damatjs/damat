import {
  getDurabilityClient,
  isTransactionalExecutor,
  TransactionalExecutorRequiredError,
  type DurabilityExecutor,
} from "@damatjs/durability";
import { DEFAULT_JOB_OPTIONS } from "../definitions/defaults";
import { getJobDefinition } from "../definitions/registry";
import type { JobName, JobPayload } from "../definitions/types";
import {
  appendJobActivity,
  claimJobDeduplication,
  findJobRun,
  insertJobRun,
  type EnqueueJobOptions,
  type JobRun,
  type NewJobRun,
} from "../repositories";

export async function enqueueJob<K extends JobName>(
  name: K,
  payload: JobPayload<K>,
  options: EnqueueJobOptions = {},
): Promise<JobRun> {
  if (options.executor) {
    if (!isTransactionalExecutor(options.executor)) {
      throw new TransactionalExecutorRequiredError();
    }
    return enqueueWith(options.executor, name, payload, options);
  }
  return getDurabilityClient().transaction((executor) =>
    enqueueWith(executor, name, payload, options),
  );
}

async function enqueueWith(
  executor: DurabilityExecutor,
  name: string,
  payload: unknown,
  options: EnqueueJobOptions,
): Promise<JobRun> {
  const run = resolveRun(name, payload, options);
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
      if (existing) return existing;
      throw new Error(`Deduplicated job run ${claim.runId} was not found`);
    }
  }
  const inserted = await insertJobRun(executor, run);
  await appendJobActivity(executor, {
    runId: inserted.id,
    type: "enqueued",
    nextStatus: "queued",
  });
  return inserted;
}

function resolveRun(
  name: string,
  payload: unknown,
  options: EnqueueJobOptions,
): NewJobRun {
  const defaults = getJobDefinition(name)?.options ?? DEFAULT_JOB_OPTIONS;
  return {
    id: crypto.randomUUID(),
    name,
    payload,
    queue: options.queue ?? defaults.queue,
    priority: options.priority ?? defaults.priority,
    maxAttempts: options.maxAttempts ?? defaults.maxAttempts,
    backoffMs: options.backoffMs ?? defaults.backoffMs,
    backoffMultiplier: options.backoffMultiplier ?? defaults.backoffMultiplier,
    availableAt: new Date(Date.now() + (options.delayMs ?? 0)),
    metadata: options.metadata ?? {},
    ...(options.correlationId ? { correlationId: options.correlationId } : {}),
    ...(options.deduplication
      ? { deduplicationKey: options.deduplication.key }
      : {}),
  };
}
