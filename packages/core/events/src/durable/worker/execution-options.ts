import type { ExecuteEventDeliveryOptions } from "./types";

const TIMER_MAX = 2_147_483_647;

export function resolveExecutionOptions(options: ExecuteEventDeliveryOptions) {
  const resolved = {
    ...options,
    leaseMs: options.leaseMs ?? 30_000,
    heartbeatIntervalMs: options.heartbeatIntervalMs ?? 10_000,
  };
  positive("leaseMs", resolved.leaseMs, true);
  positive("heartbeatIntervalMs", resolved.heartbeatIntervalMs, true);
  if (resolved.heartbeatIntervalMs >= resolved.leaseMs) {
    throw new Error("heartbeatIntervalMs must be less than leaseMs");
  }
  const progress = options.progressMinimumIntervalMs;
  if (
    progress !== undefined &&
    (!Number.isFinite(progress) || progress < 0 || progress > TIMER_MAX)
  ) {
    throw new Error("progressMinimumIntervalMs must be a nonnegative number");
  }
  if (options.logLimits) {
    positive("logLimits.maxCount", options.logLimits.maxCount, true);
    positive("logLimits.maxBytes", options.logLimits.maxBytes, true);
  }
  return resolved;
}

function positive(name: string, value: number, integer = false): void {
  if (
    !Number.isFinite(value) ||
    value <= 0 ||
    value > TIMER_MAX ||
    (integer && !Number.isInteger(value))
  ) {
    throw new Error(
      `${name} must be a positive${integer ? " integer" : " number"}`,
    );
  }
}
