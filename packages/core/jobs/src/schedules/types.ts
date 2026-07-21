import type { DurabilityExecutor } from "@damatjs/durability";
import type { JobSchedule } from "../repositories";

export type JobScheduleInput =
  | { kind: "once"; at: Date }
  | { kind: "interval"; everyMs: number; startsAt?: Date };

export interface CreateJobScheduleInput {
  name: string;
  jobName: string;
  payload: unknown;
  schedule: JobScheduleInput;
  enabled?: boolean;
  queue?: string;
  priority?: number;
  maxAttempts?: number;
  backoffMs?: number;
  backoffMultiplier?: number;
  metadata?: Record<string, unknown>;
  deduplication?: { key: string; ttlMs?: number };
  executor?: DurabilityExecutor;
}

export interface UpdateJobScheduleInput {
  schedule?: JobScheduleInput;
  enabled?: boolean;
  payload?: unknown;
  metadata?: Record<string, unknown>;
  executor?: DurabilityExecutor;
}

export interface ReconcileSchedulesOptions {
  limit?: number;
  queue?: string;
  executor?: DurabilityExecutor;
}

export type { JobSchedule };
