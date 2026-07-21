import { DEFAULT_JOB_OPTIONS } from "../definitions/defaults";
import { getJobDefinition } from "../definitions/registry";
import type { EnqueueJobOptions, NewJobRun } from "../repositories";

export function resolveJobRun(
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
