import type { QueryResultRow } from "@damatjs/deps/pg";
import type { JsonValue } from "@damatjs/durability";
import type { JobRunStatus } from "./run-types";
import type { PostgresInteger } from "./safe-number";

export interface JobAttemptRow extends QueryResultRow {
  id: string;
  run_id: string;
  attempt_number: number;
  worker_id: string;
  lease_token: string;
  started_at: Date;
  heartbeat_at: Date | null;
  finished_at: Date | null;
  duration_ms: PostgresInteger | null;
  result: JsonValue | null;
  outcome: string | null;
  error: Record<string, unknown> | null;
}

export interface JobActivityRow extends QueryResultRow {
  id: string;
  run_id: string;
  attempt_number: number | null;
  type: string;
  previous_status: JobRunStatus | null;
  next_status: JobRunStatus | null;
  worker_id: string | null;
  lease_token: string | null;
  occurred_at: Date;
  reason: string | null;
  duration_ms: PostgresInteger | null;
  metadata: Record<string, unknown>;
  actor: Record<string, unknown>;
}

export interface JobLogRow extends QueryResultRow {
  id: string;
  run_id: string;
  attempt_number: number;
  timestamp: Date;
  level: "debug" | "info" | "warn" | "error";
  message: string;
  context: Record<string, unknown>;
  worker_id: string | null;
  correlation_id: string | null;
  trace_id: string | null;
  sequence: number;
}
