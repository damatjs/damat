import type { QueryResultRow } from "@damatjs/deps/pg";
import type { JsonValue } from "@damatjs/durability";
import type { DurableEventDelivery } from "./deliveries";

export interface DurableEventDeliveryRow extends QueryResultRow {
  id: string;
  event_id: string;
  consumer: string;
  status: DurableEventDelivery["status"];
  attempt_count: number;
  max_attempts: number;
  backoff_ms: string | number;
  backoff_multiplier: number;
  available_at: Date;
  retention_at: Date;
  lease_owner: string | null;
  lease_token: string | null;
  lease_expires_at: Date | null;
  heartbeat_at: Date | null;
  progress: JsonValue | null;
  result: JsonValue | null;
  last_error: Record<string, unknown> | null;
  cancellation_requested_at: Date | null;
  created_at: Date;
  updated_at: Date;
  started_at: Date | null;
  completed_at: Date | null;
}

export function mapDurableEventDelivery(
  row: DurableEventDeliveryRow,
): DurableEventDelivery {
  return {
    id: row.id,
    eventId: row.event_id,
    consumer: row.consumer,
    status: row.status,
    attemptCount: row.attempt_count,
    maxAttempts: row.max_attempts,
    backoffMs: Number(row.backoff_ms),
    backoffMultiplier: row.backoff_multiplier,
    availableAt: row.available_at,
    retentionAt: row.retention_at,
    ...(row.lease_owner ? { leaseOwner: row.lease_owner } : {}),
    ...(row.lease_token ? { leaseToken: row.lease_token } : {}),
    ...(row.lease_expires_at ? { leaseExpiresAt: row.lease_expires_at } : {}),
    ...(row.heartbeat_at ? { heartbeatAt: row.heartbeat_at } : {}),
    ...(row.progress !== null ? { progress: row.progress } : {}),
    ...(row.result !== null ? { result: row.result } : {}),
    ...(row.last_error ? { lastError: row.last_error } : {}),
    ...(row.cancellation_requested_at
      ? { cancellationRequestedAt: row.cancellation_requested_at }
      : {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...(row.started_at ? { startedAt: row.started_at } : {}),
    ...(row.completed_at ? { completedAt: row.completed_at } : {}),
  };
}
