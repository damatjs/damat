import type { QueryResultRow } from "@damatjs/deps/pg";
import type { JsonValue } from "@damatjs/durability";
import type { DurableEventDeliveryAttempt } from "./attempts";

export interface EventDeliveryAttemptRow extends QueryResultRow {
  id: string;
  delivery_id: string;
  attempt_number: number;
  worker_id: string;
  lease_token: string;
  started_at: Date;
  available_at: Date | null;
  wait_ms: string | number | null;
  heartbeat_at: Date | null;
  finished_at: Date | null;
  duration_ms: string | number | null;
  result: JsonValue | null;
  outcome: DurableEventDeliveryAttempt["outcome"] | null;
  error: Record<string, unknown> | null;
}

export function mapEventDeliveryAttempt(
  row: EventDeliveryAttemptRow,
): DurableEventDeliveryAttempt {
  return {
    id: String(row.id),
    deliveryId: row.delivery_id,
    attemptNumber: row.attempt_number,
    workerId: row.worker_id,
    leaseToken: row.lease_token,
    startedAt: row.started_at,
    ...(row.available_at ? { availableAt: row.available_at } : {}),
    ...(row.wait_ms !== null ? { waitMs: Number(row.wait_ms) } : {}),
    ...(row.heartbeat_at ? { heartbeatAt: row.heartbeat_at } : {}),
    ...(row.finished_at ? { finishedAt: row.finished_at } : {}),
    ...(row.duration_ms !== null
      ? { durationMs: Number(row.duration_ms) }
      : {}),
    ...(row.result !== null ? { result: row.result } : {}),
    ...(row.outcome ? { outcome: row.outcome } : {}),
    ...(row.error ? { error: row.error } : {}),
  };
}
