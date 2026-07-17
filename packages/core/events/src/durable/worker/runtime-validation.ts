import type {
  DurableEventWorkerOptions,
  ResolvedEventWorkerOptions,
} from "./runtime-options";

const TIMER_MAX = 2_147_483_647;

export function validateEventWorkerIdentity(
  options: DurableEventWorkerOptions,
): void {
  if (!options.consumers?.length)
    throw new Error("at least one consumer is required");
  if (options.workerId !== undefined && !options.workerId.trim()) {
    throw new Error("workerId must be a non-empty string");
  }
}

export function validateResolvedEventWorkerOptions(
  options: ResolvedEventWorkerOptions,
): void {
  for (const [name, value, max] of numericOptions(options)) {
    if (!Number.isSafeInteger(value) || value < 1 || value > max) {
      throw new Error(`${name} must be a positive safe integer`);
    }
  }
  if (options.registryHeartbeatIntervalMs > 25_000) {
    throw new Error("registryHeartbeatIntervalMs must be at most 25000");
  }
}

function numericOptions(options: ResolvedEventWorkerOptions) {
  return [
    ["concurrency", options.concurrency, 1_000],
    ["pollIntervalMs", options.pollIntervalMs, TIMER_MAX],
    ["leaseMs", options.leaseMs, TIMER_MAX],
    ["heartbeatIntervalMs", options.heartbeatIntervalMs, TIMER_MAX],
    [
      "registryHeartbeatIntervalMs",
      options.registryHeartbeatIntervalMs,
      TIMER_MAX,
    ],
    ["retryIntervalMs", options.retryIntervalMs, TIMER_MAX],
    ["reconcileIntervalMs", options.reconcileIntervalMs, TIMER_MAX],
    ["reconcileBatchSize", options.reconcileBatchSize, 1_000],
    ["retentionIntervalMs", options.retentionIntervalMs, TIMER_MAX],
  ] as const;
}
