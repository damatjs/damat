import type { DurableEventWorkerOptions } from "@damatjs/events";
import type { JobWorkerOptions } from "@damatjs/jobs";
import type { DurabilityServiceConfig } from "../../config";

type CommonOptions = Omit<DurableEventWorkerOptions, "consumers">;

export function commonWorkerOptions(
  value: DurabilityServiceConfig | undefined,
): CommonOptions {
  if (!value) return {};
  const {
    pollIntervalMs,
    leaseMs,
    heartbeatIntervalMs,
    registryHeartbeatIntervalMs,
    retryIntervalMs,
    progressMinimumIntervalMs,
    logLimits,
    redaction,
    reconcileIntervalMs,
    reconcileBatchSize,
    retentionIntervalMs,
  } = value;
  return {
    ...(pollIntervalMs !== undefined && { pollIntervalMs }),
    ...(leaseMs !== undefined && { leaseMs }),
    ...(heartbeatIntervalMs !== undefined && { heartbeatIntervalMs }),
    ...(registryHeartbeatIntervalMs !== undefined && {
      registryHeartbeatIntervalMs,
    }),
    ...(retryIntervalMs !== undefined && { retryIntervalMs }),
    ...(progressMinimumIntervalMs !== undefined && {
      progressMinimumIntervalMs,
    }),
    ...(logLimits !== undefined && { logLimits }),
    ...(redaction !== undefined && { redaction }),
    ...(reconcileIntervalMs !== undefined && { reconcileIntervalMs }),
    ...(reconcileBatchSize !== undefined && { reconcileBatchSize }),
    ...(retentionIntervalMs !== undefined && { retentionIntervalMs }),
  };
}

export function jobWorkerOptions(
  value: DurabilityServiceConfig | undefined,
): JobWorkerOptions {
  const retentionMs = value?.retentionMs;
  return {
    ...commonWorkerOptions(value),
    ...(retentionMs !== undefined && { retentionMs }),
  };
}
