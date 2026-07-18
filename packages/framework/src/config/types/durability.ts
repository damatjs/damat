import type {
  InspectionVisibility,
  RedactionOptions,
  WorkLogLimits,
  RetentionDuration,
} from "@damatjs/durability";

export interface DurabilityServiceConfig {
  pollIntervalMs?: number;
  leaseMs?: number;
  heartbeatIntervalMs?: number;
  registryHeartbeatIntervalMs?: number;
  retryIntervalMs?: number;
  reconcileIntervalMs?: number;
  reconcileBatchSize?: number;
  retentionIntervalMs?: number;
  retentionMs?: RetentionDuration;
  progressMinimumIntervalMs?: number;
  logLimits?: WorkLogLimits;
  redaction?: RedactionOptions;
  inspectionVisibility?: InspectionVisibility;
  wakeups?: boolean;
  acceleration?: DurabilityAccelerationConfig;
}

export interface DurabilityAccelerationConfig {
  enabled?: boolean;
  healthySafetyPollIntervalMs?: number;
  degradedMaxPollIntervalMs?: number;
  workerLivenessTtlMs?: number;
  durableWorkerSnapshotIntervalMs?: number;
  relayBatchSize?: number;
}
