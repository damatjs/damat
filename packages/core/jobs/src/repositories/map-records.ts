import type { JobActivity, JobAttempt, JobLog } from "./record-types";
import type { JobActivityRow, JobAttemptRow, JobLogRow } from "./record-rows";
import { mapSafeInteger } from "./safe-number";

export function mapJobAttempt(row: JobAttemptRow): JobAttempt {
  return {
    id: String(row.id),
    runId: row.run_id,
    attemptNumber: row.attempt_number,
    workerId: row.worker_id,
    leaseToken: row.lease_token,
    startedAt: row.started_at,
    ...(row.available_at ? { availableAt: row.available_at } : {}),
    ...(row.wait_ms !== null
      ? { waitMs: mapSafeInteger(row.wait_ms, "attempt wait_ms") }
      : {}),
    ...(row.heartbeat_at ? { heartbeatAt: row.heartbeat_at } : {}),
    ...(row.finished_at ? { finishedAt: row.finished_at } : {}),
    ...(row.duration_ms !== null
      ? {
          durationMs: mapSafeInteger(row.duration_ms, "attempt duration_ms"),
        }
      : {}),
    ...(row.result !== null ? { result: row.result } : {}),
    ...(row.outcome ? { outcome: row.outcome } : {}),
    ...(row.error ? { error: row.error } : {}),
  };
}

export function mapJobActivity(row: JobActivityRow): JobActivity {
  return {
    id: String(row.id),
    runId: row.run_id,
    type: row.type,
    occurredAt: row.occurred_at,
    metadata: row.metadata,
    actor: row.actor,
    ...(row.attempt_number !== null
      ? { attemptNumber: row.attempt_number }
      : {}),
    ...(row.previous_status !== null
      ? { previousStatus: row.previous_status }
      : {}),
    ...(row.next_status !== null ? { nextStatus: row.next_status } : {}),
    ...(row.worker_id !== null ? { workerId: row.worker_id } : {}),
    ...(row.lease_token !== null ? { leaseToken: row.lease_token } : {}),
    ...(row.reason !== null ? { reason: row.reason } : {}),
    ...(row.duration_ms !== null
      ? {
          durationMs: mapSafeInteger(row.duration_ms, "activity duration_ms"),
        }
      : {}),
  };
}

export function mapJobLog(row: JobLogRow): JobLog {
  return {
    id: String(row.id),
    runId: row.run_id,
    attemptNumber: row.attempt_number,
    timestamp: row.timestamp,
    level: row.level,
    message: row.message,
    context: row.context,
    sequence: row.sequence,
    ...(row.worker_id !== null ? { workerId: row.worker_id } : {}),
    ...(row.correlation_id !== null
      ? { correlationId: row.correlation_id }
      : {}),
    ...(row.trace_id !== null ? { traceId: row.trace_id } : {}),
  };
}
