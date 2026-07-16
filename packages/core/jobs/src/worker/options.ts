import { DEFAULT_JOB_QUEUE } from "../definitions/defaults";
import type { JobWorkerOptions } from "./types";
import { validateWorkerOptions } from "./validate-options";

export type ResolvedWorkerOptions = JobWorkerOptions & {
  queue: string;
  concurrency: number;
  pollIntervalMs: number;
  leaseMs: number;
  heartbeatIntervalMs: number;
  registryHeartbeatIntervalMs: number;
  retryIntervalMs: number;
  reconcileIntervalMs: number;
  reconcileBatchSize: number;
  retentionIntervalMs: number;
  retentionMs: number;
};

export function resolveWorkerOptions(
  options: JobWorkerOptions,
): ResolvedWorkerOptions {
  validateWorkerOptions(options);
  const resolved = {
    ...options,
    queue: options.queue ?? DEFAULT_JOB_QUEUE,
    concurrency: options.concurrency ?? 1,
    pollIntervalMs: options.pollIntervalMs ?? 1_000,
    leaseMs: options.leaseMs ?? 30_000,
    heartbeatIntervalMs: options.heartbeatIntervalMs ?? 10_000,
    registryHeartbeatIntervalMs: options.registryHeartbeatIntervalMs ?? 5_000,
    retryIntervalMs: Math.min(options.retryIntervalMs ?? 1_000, 5_000),
    reconcileIntervalMs: options.reconcileIntervalMs ?? 5_000,
    reconcileBatchSize: options.reconcileBatchSize ?? 100,
    retentionIntervalMs: options.retentionIntervalMs ?? 3_600_000,
    retentionMs: options.retentionMs ?? 604_800_000,
  };
  if (resolved.heartbeatIntervalMs >= resolved.leaseMs) {
    throw new Error("heartbeatIntervalMs must be less than leaseMs");
  }
  return resolved;
}
