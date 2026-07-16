import type { QueryResultRow } from "@damatjs/deps/pg";
import type { JobSchedule } from "./schedule-types";

export interface JobScheduleRow extends QueryResultRow {
  id: string;
  name: string;
  job_name: string;
  kind: "once" | "interval" | "cron";
  enabled: boolean;
  payload: unknown;
  metadata: Record<string, unknown>;
  queue: string;
  priority: number;
  max_attempts: number;
  backoff_ms: number;
  backoff_multiplier: number;
  run_at: Date | null;
  interval_ms: number | null;
  next_occurrence_at: Date | null;
  last_occurrence_at: Date | null;
  deduplication_key: string | null;
  deduplication_ttl_ms: number | null;
  created_at: Date;
  updated_at: Date;
}

export function mapJobSchedule(row: JobScheduleRow): JobSchedule {
  return {
    id: row.id,
    name: row.name,
    jobName: row.job_name,
    kind: row.kind,
    enabled: row.enabled,
    payload: row.payload,
    metadata: row.metadata,
    queue: row.queue,
    priority: row.priority,
    maxAttempts: row.max_attempts,
    backoffMs: row.backoff_ms,
    backoffMultiplier: row.backoff_multiplier,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...(row.run_at ? { runAt: row.run_at } : {}),
    ...(row.interval_ms !== null ? { intervalMs: row.interval_ms } : {}),
    ...(row.next_occurrence_at
      ? { nextOccurrenceAt: row.next_occurrence_at }
      : {}),
    ...(row.last_occurrence_at
      ? { lastOccurrenceAt: row.last_occurrence_at }
      : {}),
    ...(row.deduplication_key
      ? { deduplicationKey: row.deduplication_key }
      : {}),
    ...(row.deduplication_ttl_ms !== null
      ? { deduplicationTtlMs: row.deduplication_ttl_ms }
      : {}),
  };
}
