import type { DurabilityExecutor } from "@damatjs/durability";

export interface JobSchedule {
  id: string;
  name: string;
  jobName: string;
  kind: "once" | "interval" | "cron";
  enabled: boolean;
  payload: unknown;
  metadata: Record<string, unknown>;
  queue: string;
  priority: number;
  maxAttempts: number;
  backoffMs: number;
  backoffMultiplier: number;
  runAt?: Date;
  intervalMs?: number;
  nextOccurrenceAt?: Date;
  lastOccurrenceAt?: Date;
  deduplicationKey?: string;
  deduplicationTtlMs?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ListJobSchedulesOptions {
  enabled?: boolean;
  executor?: DurabilityExecutor;
}
