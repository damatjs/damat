import type { QueryResultRow } from "@damatjs/deps/pg";
import type { ClaimedEventDelivery } from "./types";

export interface EventDeliveryClaimRow extends QueryResultRow {
  id: string;
  event_id: string;
  event_name: string;
  consumer: string;
  payload: unknown;
  metadata: Record<string, unknown>;
  correlation_id: string | null;
  causation_id: string | null;
  attempt_count: number;
  max_attempts: number;
  backoff_ms: string | number;
  backoff_multiplier: number;
  retention_at: Date | null;
  available_at: Date;
  wait_ms?: string | number;
  lease_owner: string;
  lease_token: string;
  lease_expires_at: Date;
  cancellation_requested_at: Date | null;
  previous_status: "pending" | "retry_wait" | "running";
}

export function mapEventDeliveryClaim(
  row: EventDeliveryClaimRow,
): ClaimedEventDelivery {
  return {
    id: row.id,
    eventId: row.event_id,
    event: row.event_name,
    consumer: row.consumer,
    payload: row.payload,
    metadata: row.metadata,
    ...(row.correlation_id ? { correlationId: row.correlation_id } : {}),
    ...(row.causation_id ? { causationId: row.causation_id } : {}),
    attemptCount: row.attempt_count,
    maxAttempts: row.max_attempts,
    backoffMs: Number(row.backoff_ms),
    backoffMultiplier: row.backoff_multiplier,
    ...(row.retention_at ? { retentionAt: row.retention_at } : {}),
    workerId: row.lease_owner,
    leaseToken: row.lease_token,
    leaseExpiresAt: row.lease_expires_at,
  };
}
