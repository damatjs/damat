import type { JobActivity, JobAttempt, JobLog } from "./record-types";
import type { JobActivityRow, JobAttemptRow, JobLogRow } from "./record-rows";

export function mapJobAttempt(row: JobAttemptRow): JobAttempt {
  return {
    id: String(row.id),
    runId: row.run_id,
    attemptNumber: row.attempt_number,
    workerId: row.worker_id,
    leaseToken: row.lease_token,
    startedAt: row.started_at,
    ...(row.heartbeat_at ? { heartbeatAt: row.heartbeat_at } : {}),
    ...(row.finished_at ? { finishedAt: row.finished_at } : {}),
    ...(row.duration_ms !== null ? { durationMs: row.duration_ms } : {}),
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
    ...(row.previous_status ? { previousStatus: row.previous_status } : {}),
    ...(row.next_status ? { nextStatus: row.next_status } : {}),
    ...(row.worker_id ? { workerId: row.worker_id } : {}),
    ...(row.lease_token ? { leaseToken: row.lease_token } : {}),
    ...(row.reason ? { reason: row.reason } : {}),
    ...(row.duration_ms !== null ? { durationMs: row.duration_ms } : {}),
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
    ...(row.worker_id ? { workerId: row.worker_id } : {}),
    ...(row.correlation_id ? { correlationId: row.correlation_id } : {}),
    ...(row.trace_id ? { traceId: row.trace_id } : {}),
  };
}
