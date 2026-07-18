import type { DurableEventWorkerOptions } from "@damatjs/events";
import type { JobWorkerOptions } from "@damatjs/jobs";
import type { DurabilityServiceConfig } from "../../config";
import type { DurabilityCoordinator } from "@damatjs/durability";

type CommonOptions = Omit<DurableEventWorkerOptions, "consumers">;

export function commonWorkerOptions(
  value: DurabilityServiceConfig | undefined,
  coordinator?: DurabilityCoordinator,
): CommonOptions {
  if (!value) return coordinator ? { coordinator } : {};
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
  const snapshotIntervalMs =
    registryHeartbeatIntervalMs ??
    value.acceleration?.durableWorkerSnapshotIntervalMs;
  return {
    ...(pollIntervalMs !== undefined && { pollIntervalMs }),
    ...(leaseMs !== undefined && { leaseMs }),
    ...(heartbeatIntervalMs !== undefined && { heartbeatIntervalMs }),
    ...(snapshotIntervalMs !== undefined && {
      registryHeartbeatIntervalMs: snapshotIntervalMs,
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
    ...(coordinator && { coordinator }),
  };
}

export function jobWorkerOptions(
  value: DurabilityServiceConfig | undefined,
  coordinator?: DurabilityCoordinator,
): JobWorkerOptions {
  const retentionMs = value?.retentionMs;
  return {
    ...commonWorkerOptions(value, coordinator),
    ...(retentionMs !== undefined && { retentionMs }),
  };
}
