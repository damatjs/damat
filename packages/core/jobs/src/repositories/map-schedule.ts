import type { QueryResultRow } from "@damatjs/deps/pg";
import type { JobSchedule } from "./schedule-types";
import { mapSafeInteger, type PostgresInteger } from "./safe-number";

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
  backoff_ms: PostgresInteger;
  backoff_multiplier: number;
  run_at: Date | null;
  interval_ms: PostgresInteger | null;
  next_occurrence_at: Date | null;
  last_occurrence_at: Date | null;
  deduplication_key: string | null;
  deduplication_ttl_ms: PostgresInteger | null;
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
    backoffMs: mapSafeInteger(row.backoff_ms, "schedule backoff_ms"),
    backoffMultiplier: row.backoff_multiplier,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...(row.run_at ? { runAt: row.run_at } : {}),
    ...(row.interval_ms !== null
      ? { intervalMs: mapSafeInteger(row.interval_ms, "schedule interval_ms") }
      : {}),
    ...(row.next_occurrence_at
      ? { nextOccurrenceAt: row.next_occurrence_at }
      : {}),
    ...(row.last_occurrence_at
      ? { lastOccurrenceAt: row.last_occurrence_at }
      : {}),
    ...(row.deduplication_key !== null
      ? { deduplicationKey: row.deduplication_key }
      : {}),
    ...(row.deduplication_ttl_ms !== null
      ? {
          deduplicationTtlMs: mapSafeInteger(
            row.deduplication_ttl_ms,
            "schedule deduplication_ttl_ms",
          ),
        }
      : {}),
  };
}
