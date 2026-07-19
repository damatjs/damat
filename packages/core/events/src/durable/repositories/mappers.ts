import type { QueryResultRow } from "@damatjs/deps/pg";
import type { DurableEventActivity, DurableEventRecord } from "./types";

export interface DurableEventRow extends QueryResultRow {
  id: string;
  name: string;
  payload: unknown;
  metadata: Record<string, unknown>;
  policy_version: number;
  max_attempts: number;
  backoff_ms: number | string;
  backoff_multiplier: number;
  retention_ms: number | string | null;
  idempotency_key: string | null;
  correlation_id: string | null;
  causation_id: string | null;
  occurred_at: Date;
  available_at: Date;
  routed_at: Date | null;
  retention_at: Date | null;
  created_at: Date;
}

export interface DurableEventActivityRow extends QueryResultRow {
  id: string;
  event_id: string;
  delivery_id: string | null;
  consumer: string | null;
  attempt_number: number | null;
  type: string;
  previous_status: string | null;
  next_status: string | null;
  worker_id: string | null;
  lease_token: string | null;
  reason: string | null;
  duration_ms: number | string | null;
  occurred_at: Date;
  metadata: Record<string, unknown>;
  actor: Record<string, unknown>;
}

export function mapDurableEvent(row: DurableEventRow): DurableEventRecord {
  return {
    id: row.id,
    name: row.name,
    payload: row.payload,
    metadata: row.metadata,
    policyVersion: row.policy_version,
    maxAttempts: row.max_attempts,
    backoffMs: Number(row.backoff_ms),
    backoffMultiplier: row.backoff_multiplier,
    retentionMs:
      row.retention_ms === null ? "forever" : Number(row.retention_ms),
    ...(row.idempotency_key ? { idempotencyKey: row.idempotency_key } : {}),
    ...(row.correlation_id ? { correlationId: row.correlation_id } : {}),
    ...(row.causation_id ? { causationId: row.causation_id } : {}),
    occurredAt: row.occurred_at,
    availableAt: row.available_at,
    ...(row.routed_at ? { routedAt: row.routed_at } : {}),
    ...(row.retention_at ? { retentionAt: row.retention_at } : {}),
    createdAt: row.created_at,
  };
}

export function mapDurableEventActivity(
  row: DurableEventActivityRow,
): DurableEventActivity {
  return {
    id: row.id,
    eventId: row.event_id,
    ...(row.delivery_id ? { deliveryId: row.delivery_id } : {}),
    ...(row.consumer ? { consumer: row.consumer } : {}),
    ...(row.attempt_number !== null
      ? { attemptNumber: row.attempt_number }
      : {}),
    type: row.type,
    ...(row.previous_status ? { previousStatus: row.previous_status } : {}),
    ...(row.next_status ? { nextStatus: row.next_status } : {}),
    ...(row.worker_id ? { workerId: row.worker_id } : {}),
    ...(row.lease_token ? { leaseToken: row.lease_token } : {}),
    ...(row.reason ? { reason: row.reason } : {}),
    ...(row.duration_ms !== null
      ? { durationMs: Number(row.duration_ms) }
      : {}),
    occurredAt: row.occurred_at,
    metadata: row.metadata,
    actor: row.actor,
  };
}
