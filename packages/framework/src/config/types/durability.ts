import type {
  InspectionVisibility,
  RedactionOptions,
  WorkLogLimits,
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
  retentionMs?: number;
  progressMinimumIntervalMs?: number;
  logLimits?: WorkLogLimits;
  redaction?: RedactionOptions;
  inspectionVisibility?: InspectionVisibility;
  wakeups?: boolean;
}
