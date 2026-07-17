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
  retention_ms: number | string;
  idempotency_key: string | null;
  correlation_id: string | null;
  causation_id: string | null;
  occurred_at: Date;
  available_at: Date;
  routed_at: Date | null;
  retention_at: Date;
  created_at: Date;
}

export interface DurableEventActivityRow extends QueryResultRow {
  id: string;
  event_id: string;
  type: string;
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
    retentionMs: Number(row.retention_ms),
    ...(row.idempotency_key ? { idempotencyKey: row.idempotency_key } : {}),
    ...(row.correlation_id ? { correlationId: row.correlation_id } : {}),
    ...(row.causation_id ? { causationId: row.causation_id } : {}),
    occurredAt: row.occurred_at,
    availableAt: row.available_at,
    ...(row.routed_at ? { routedAt: row.routed_at } : {}),
    retentionAt: row.retention_at,
    createdAt: row.created_at,
  };
}

export function mapDurableEventActivity(
  row: DurableEventActivityRow,
): DurableEventActivity {
  return {
    id: row.id,
    eventId: row.event_id,
    type: row.type,
    occurredAt: row.occurred_at,
    metadata: row.metadata,
    actor: row.actor,
  };
}
