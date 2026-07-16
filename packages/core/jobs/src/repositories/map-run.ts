import type { QueryResultRow } from "@damatjs/deps/pg";
import type { JsonValue } from "@damatjs/durability";
import type { JobRun, JobRunStatus } from "./run-types";

export interface JobRunRow extends QueryResultRow {
  id: string;
  name: string;
  queue: string;
  status: JobRunStatus;
  payload: unknown;
  metadata: Record<string, unknown>;
  priority: number;
  available_at: Date;
  attempt_count: number;
  max_attempts: number;
  backoff_ms: number;
  backoff_multiplier: number;
  progress: JsonValue | null;
  result: JsonValue | null;
  correlation_id: string | null;
  deduplication_key: string | null;
  cancellation_requested_at: Date | null;
  created_at: Date;
  updated_at: Date;
  started_at: Date | null;
  completed_at: Date | null;
}

export function mapJobRun(row: JobRunRow): JobRun {
  return {
    id: row.id,
    name: row.name,
    queue: row.queue,
    status: row.status,
    payload: row.payload,
    metadata: row.metadata,
    priority: row.priority,
    availableAt: row.available_at,
    attemptCount: row.attempt_count,
    maxAttempts: row.max_attempts,
    backoffMs: row.backoff_ms,
    backoffMultiplier: row.backoff_multiplier,
    ...(row.progress !== null ? { progress: row.progress } : {}),
    ...(row.result !== null ? { result: row.result } : {}),
    ...(row.correlation_id ? { correlationId: row.correlation_id } : {}),
    ...(row.deduplication_key
      ? { deduplicationKey: row.deduplication_key }
      : {}),
    ...(row.cancellation_requested_at
      ? { cancellationRequestedAt: row.cancellation_requested_at }
      : {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...(row.started_at ? { startedAt: row.started_at } : {}),
    ...(row.completed_at ? { completedAt: row.completed_at } : {}),
  };
}
