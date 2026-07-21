import type { DurabilityExecutor } from "@damatjs/durability";
import { appendEventActivity } from "../repositories/activity";

export interface ExpiredEventDeliveryLease {
  id: string;
  event_id: string;
  consumer: string;
  attempt_count: number;
  max_attempts: number;
  cancellation_requested_at: Date | null;
  lease_owner: string;
  lease_token: string;
}

export type RecoveredDeliveryStatus = "pending" | "dead_lettered" | "cancelled";

export async function recoverExpiredEventDeliveryLease(
  executor: DurabilityExecutor,
  row: ExpiredEventDeliveryLease,
): Promise<RecoveredDeliveryStatus> {
  const attempt = await executor.query<{ duration_ms: string }>(
    `UPDATE "_damat_event_delivery_attempts" SET "finished_at"=NOW(),
     "outcome"='lost',"duration_ms"=GREATEST(0,
       EXTRACT(EPOCH FROM (NOW()-"started_at"))*1000)
     WHERE "delivery_id"=$1 AND "attempt_number"=$2
       AND "lease_token"=$3 AND "finished_at" IS NULL
     RETURNING "duration_ms"`,
    [row.id, row.attempt_count, row.lease_token],
  );
  if (attempt.rowCount !== 1) {
    throw new Error(`Expired delivery ${row.id} has no active attempt`);
  }
  const status: RecoveredDeliveryStatus = row.cancellation_requested_at
    ? "cancelled"
    : row.attempt_count >= row.max_attempts
      ? "dead_lettered"
      : "pending";
  const recovered = await executor.query(
    `UPDATE "_damat_event_deliveries" SET "status"=$2,
     "lease_owner"=NULL,"lease_token"=NULL,"lease_expires_at"=NULL,
     "heartbeat_at"=NULL,
     "available_at"=CASE WHEN $2='pending' THEN NOW() ELSE "available_at" END,
     "retention_at"=CASE WHEN $2='pending'
       THEN GREATEST("retention_at",NOW()) ELSE "retention_at" END,
     "completed_at"=CASE WHEN $2='pending' THEN NULL ELSE NOW() END,
     "updated_at"=NOW() WHERE "id"=$1 AND "event_id"=$3 AND "consumer"=$4
       AND "status"='running' AND "lease_owner"=$5 AND "lease_token"=$6
       AND "lease_expires_at"<=NOW()`,
    [
      row.id,
      status,
      row.event_id,
      row.consumer,
      row.lease_owner,
      row.lease_token,
    ],
  );
  if (recovered.rowCount !== 1) {
    throw new Error(`Expired delivery ${row.id} lease changed during recovery`);
  }
  await appendEventActivity(executor, {
    eventId: row.event_id,
    deliveryId: row.id,
    consumer: row.consumer,
    attemptNumber: row.attempt_count,
    type: "lease_recovered",
    previousStatus: "running",
    nextStatus: status,
    workerId: row.lease_owner,
    leaseToken: row.lease_token,
    durationMs: Number(attempt.rows[0]!.duration_ms),
    reason: "expired lease",
  });
  return status;
}
