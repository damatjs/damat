import type { JobWorkerOptions } from "./types";

export const MAX_REGISTRY_HEARTBEAT_INTERVAL_MS = 120_000;
const INT32_MAX = 2_147_483_647;
const TIMER_MAX = 2_147_483_647;

function positive(
  name: string,
  value: number,
  integer = false,
  maximum = Number.MAX_SAFE_INTEGER,
): void {
  if (
    !Number.isFinite(value) ||
    value <= 0 ||
    value > maximum ||
    (integer && !Number.isInteger(value))
  ) {
    throw new Error(
      `${name} must be a positive${integer ? " integer" : " number"}`,
    );
  }
}

function validateStrings(options: JobWorkerOptions): void {
  if (options.queue !== undefined && !options.queue.trim()) {
    throw new Error("queue must be a non-empty string");
  }
  if (options.workerId !== undefined && !options.workerId.trim()) {
    throw new Error("workerId must be a non-empty string");
  }
}

function validateNumbers(options: JobWorkerOptions): void {
  if (options.concurrency !== undefined) {
    positive("concurrency", options.concurrency, true, INT32_MAX);
  }
  for (const name of [
    "pollIntervalMs",
    "retryIntervalMs",
    "leaseMs",
    "heartbeatIntervalMs",
    "registryHeartbeatIntervalMs",
    "reconcileIntervalMs",
    "retentionIntervalMs",
  ] as const) {
    const value = options[name];
    if (value !== undefined) positive(name, value, false, TIMER_MAX);
  }
  const retention = options.retentionMs;
  if (retention !== undefined && retention !== "forever") {
    positive("retentionMs", retention);
  }
  if (options.reconcileBatchSize !== undefined) {
    positive("reconcileBatchSize", options.reconcileBatchSize, true, INT32_MAX);
  }
  const progress = options.progressMinimumIntervalMs;
  if (
    progress !== undefined &&
    (!Number.isFinite(progress) || progress < 0 || progress > TIMER_MAX)
  ) {
    throw new Error("progressMinimumIntervalMs must be a nonnegative number");
  }
}

function validateLogs(options: JobWorkerOptions): void {
  if (!options.logLimits) return;
  positive("logLimits.maxCount", options.logLimits.maxCount, true);
  positive("logLimits.maxBytes", options.logLimits.maxBytes, true);
}

export function validateWorkerOptions(options: JobWorkerOptions): void {
  validateStrings(options);
  validateNumbers(options);
  validateLogs(options);
  if (
    options.registryHeartbeatIntervalMs !== undefined &&
    options.registryHeartbeatIntervalMs > MAX_REGISTRY_HEARTBEAT_INTERVAL_MS
  ) {
    throw new Error(
      `registryHeartbeatIntervalMs must be at most ${MAX_REGISTRY_HEARTBEAT_INTERVAL_MS}`,
    );
  }
}

export function validateStopGrace(graceMs: number | undefined): void {
  if (graceMs === undefined) return;
  if (!Number.isFinite(graceMs) || graceMs < 0 || graceMs > TIMER_MAX) {
    throw new Error(`graceMs must be between 0 and ${TIMER_MAX}`);
  }
}
