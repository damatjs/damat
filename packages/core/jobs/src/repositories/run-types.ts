import type { DurabilityExecutor, JsonValue } from "@damatjs/durability";

export type JobRunStatus =
  | "queued"
  | "running"
  | "retry_wait"
  | "succeeded"
  | "dead_lettered"
  | "cancelled";

export interface JobRun {
  id: string;
  name: string;
  queue: string;
  status: JobRunStatus;
  payload: unknown;
  metadata: Record<string, unknown>;
  priority: number;
  availableAt: Date;
  attemptCount: number;
  maxAttempts: number;
  backoffMs: number;
  backoffMultiplier: number;
  progress?: JsonValue;
  result?: JsonValue;
  correlationId?: string;
  deduplicationKey?: string;
  scheduleId?: string;
  scheduledFor?: Date;
  cancellationRequestedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export interface EnqueueJobOptions {
  queue?: string;
  priority?: number;
  delayMs?: number;
  maxAttempts?: number;
  backoffMs?: number;
  backoffMultiplier?: number;
  deduplication?: { key: string; expiresAt?: Date };
  metadata?: Record<string, unknown>;
  correlationId?: string;
  executor?: DurabilityExecutor;
}

export interface NewJobRun {
  id: string;
  name: string;
  queue: string;
  payload: unknown;
  metadata: Record<string, unknown>;
  priority: number;
  availableAt: Date;
  maxAttempts: number;
  backoffMs: number;
  backoffMultiplier: number;
  deduplicationKey?: string;
  correlationId?: string;
  scheduleId?: string;
  scheduledFor?: Date;
}

export interface ListJobRunsOptions {
  name?: string;
  queue?: string;
  status?: JobRunStatus;
  limit?: number;
  executor?: DurabilityExecutor;
}
