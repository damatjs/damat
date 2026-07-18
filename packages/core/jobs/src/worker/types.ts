import type {
  DurabilityCoordinator,
  JsonValue,
  RedactionOptions,
  WorkLogLimits,
  RetentionDuration,
} from "@damatjs/durability";
import type { DurabilityClient } from "@damatjs/durability";
import type { JobWakeupRedis } from "../wakeup";
import type { JobRun } from "../repositories";

export interface ClaimedJobRun extends JobRun {
  workerId: string;
  leaseToken: string;
  leaseExpiresAt: Date;
}

export interface ClaimJobRunsOptions {
  queue: string;
  workerId: string;
  limit: number;
  leaseMs: number;
  client?: DurabilityClient;
}

export interface JobWorkerOptions {
  queue?: string;
  workerId?: string;
  concurrency?: number;
  pollIntervalMs?: number;
  leaseMs?: number;
  heartbeatIntervalMs?: number;
  registryHeartbeatIntervalMs?: number;
  retryIntervalMs?: number;
  progressMinimumIntervalMs?: number;
  logLimits?: WorkLogLimits;
  redaction?: RedactionOptions;
  reconcileIntervalMs?: number;
  reconcileBatchSize?: number;
  retentionIntervalMs?: number;
  retentionMs?: RetentionDuration;
  wakeupRedis?: JobWakeupRedis;
  coordinator?: DurabilityCoordinator;
  batchHeartbeats?: boolean;
}

export interface ExecuteJobOptions extends JobWorkerOptions {
  heartbeatIntervalMs: number;
}

export type JobResult = JsonValue | undefined;
