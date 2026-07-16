import { DEFAULT_JOB_QUEUE } from "../definitions/defaults";
import type { JobWorkerOptions } from "./types";

export type ResolvedWorkerOptions = JobWorkerOptions & {
  queue: string;
  concurrency: number;
  pollIntervalMs: number;
  leaseMs: number;
  heartbeatIntervalMs: number;
  registryHeartbeatIntervalMs: number;
  retryIntervalMs: number;
};

export function resolveWorkerOptions(
  options: JobWorkerOptions,
): ResolvedWorkerOptions {
  return {
    ...options,
    queue: options.queue ?? DEFAULT_JOB_QUEUE,
    concurrency: options.concurrency ?? 1,
    pollIntervalMs: options.pollIntervalMs ?? 1_000,
    leaseMs: options.leaseMs ?? 30_000,
    heartbeatIntervalMs: options.heartbeatIntervalMs ?? 10_000,
    registryHeartbeatIntervalMs: options.registryHeartbeatIntervalMs ?? 5_000,
    retryIntervalMs: Math.min(options.retryIntervalMs ?? 1_000, 5_000),
  };
}
