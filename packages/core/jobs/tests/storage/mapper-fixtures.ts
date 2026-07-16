import type { JobRunRow } from "../../src/repositories/map-run";
import type { JobScheduleRow } from "../../src/repositories/map-schedule";
import type {
  JobActivityRow,
  JobLogRow,
} from "../../src/repositories/record-rows";

export function runRow(overrides: Partial<JobRunRow> = {}): JobRunRow {
  const now = new Date();
  return {
    id: crypto.randomUUID(),
    name: "job",
    queue: "queue",
    status: "queued",
    payload: {},
    metadata: {},
    priority: 1,
    available_at: now,
    attempt_count: 0,
    max_attempts: 3,
    backoff_ms: 1000,
    backoff_multiplier: 2,
    progress: null,
    result: null,
    correlation_id: "",
    deduplication_key: "",
    cancellation_requested_at: null,
    created_at: now,
    updated_at: now,
    started_at: null,
    completed_at: null,
    ...overrides,
  };
}

export function activityRow(
  overrides: Partial<JobActivityRow> = {},
): JobActivityRow {
  return {
    id: "1",
    run_id: crypto.randomUUID(),
    attempt_number: null,
    type: "test",
    previous_status: null,
    next_status: null,
    worker_id: "",
    lease_token: "",
    occurred_at: new Date(),
    reason: "",
    duration_ms: null,
    metadata: {},
    actor: {},
    ...overrides,
  };
}

export function logRow(): JobLogRow {
  return {
    id: "1",
    run_id: crypto.randomUUID(),
    attempt_number: 1,
    timestamp: new Date(),
    level: "info",
    message: "test",
    context: {},
    worker_id: "",
    correlation_id: "",
    trace_id: "",
    sequence: 1,
  };
}

export function scheduleRow(): JobScheduleRow {
  const now = new Date();
  return {
    id: crypto.randomUUID(),
    name: "schedule",
    job_name: "job",
    kind: "once",
    enabled: true,
    payload: {},
    metadata: {},
    queue: "queue",
    priority: 1,
    max_attempts: 3,
    backoff_ms: 1000,
    backoff_multiplier: 2,
    run_at: null,
    interval_ms: null,
    next_occurrence_at: null,
    last_occurrence_at: null,
    deduplication_key: "",
    deduplication_ttl_ms: null,
    created_at: now,
    updated_at: now,
  };
}
