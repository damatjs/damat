import type { DurabilityExecutor, JsonValue } from "@damatjs/durability";
import { appendEventActivity } from "../repositories/activity";
import { EventDeliveryLeaseLostError } from "./errors";
import type { ClaimedEventDelivery } from "./types";

export type DeliveryOutcome =
  "retry_wait" | "succeeded" | "dead_lettered" | "cancelled";

export interface FinishEventDeliveryInput {
  status: DeliveryOutcome;
  result?: JsonValue;
  error?: Record<string, unknown>;
  reason?: string;
  availableAt?: Date;
}

export async function finishEventDelivery(
  executor: DurabilityExecutor,
  claim: ClaimedEventDelivery,
  input: FinishEventDeliveryInput,
): Promise<void> {
  const terminal = input.status !== "retry_wait";
  const updated = await executor.query<{ progress: JsonValue | null }>(
    `UPDATE "_damat_event_deliveries" SET "status"=$4,"result"=$5::jsonb,
     "last_error"=$6::jsonb,"available_at"=COALESCE($7,"available_at"),
     "retention_at"=GREATEST("retention_at",COALESCE($7,"available_at")),
     "lease_owner"=NULL,"lease_token"=NULL,"lease_expires_at"=NULL,
     "heartbeat_at"=NULL,"updated_at"=NOW(),
     "completed_at"=CASE WHEN $8 THEN NOW() ELSE NULL END
     WHERE "id"=$1 AND "event_id"=$9 AND "consumer"=$10
       AND "status"='running' AND "lease_owner"=$2
       AND "lease_token"=$3 AND "lease_expires_at">NOW()
     RETURNING "progress"`,
    [
      claim.id,
      claim.workerId,
      claim.leaseToken,
      input.status,
      input.result === undefined ? null : JSON.stringify(input.result),
      input.error ? JSON.stringify(input.error) : null,
      input.availableAt ?? null,
      terminal,
      claim.eventId,
      claim.consumer,
    ],
  );
  if (updated.rowCount !== 1) throw new EventDeliveryLeaseLostError(claim.id);
  const durationMs = await closeEventDeliveryAttempt(executor, claim, input);
  const schedule =
    input.status === "retry_wait" && input.availableAt
      ? {
          availableAt: input.availableAt.toISOString(),
          backoffMs: claim.backoffMs,
          backoffMultiplier: claim.backoffMultiplier,
        }
      : undefined;
  await appendEventActivity(executor, {
    eventId: claim.eventId,
    deliveryId: claim.id,
    consumer: claim.consumer,
    attemptNumber: claim.attemptCount,
    type: input.status,
    previousStatus: "running",
    nextStatus: input.status,
    workerId: claim.workerId,
    leaseToken: claim.leaseToken,
    durationMs,
    ...(input.reason ? { reason: input.reason } : {}),
    ...(schedule
      ? { metadata: schedule }
      : terminal && updated.rows[0]?.progress !== null
        ? { metadata: { progress: updated.rows[0]?.progress } }
        : {}),
  });
}

async function closeEventDeliveryAttempt(
  executor: DurabilityExecutor,
  claim: ClaimedEventDelivery,
  input: FinishEventDeliveryInput,
): Promise<number> {
  const result = await executor.query(
    `UPDATE "_damat_event_delivery_attempts" SET "finished_at"=NOW(),
     "duration_ms"=GREATEST(0,EXTRACT(EPOCH FROM (NOW()-"started_at"))*1000),
     "result"=$4::jsonb,"outcome"=$5,"error"=$6::jsonb
     WHERE "delivery_id"=$1 AND "attempt_number"=$2 AND "lease_token"=$3
       AND "finished_at" IS NULL RETURNING "duration_ms"`,
    [
      claim.id,
      claim.attemptCount,
      claim.leaseToken,
      input.result === undefined ? null : JSON.stringify(input.result),
      input.status,
      input.error ? JSON.stringify(input.error) : null,
    ],
  );
  if (result.rowCount !== 1) throw new EventDeliveryLeaseLostError(claim.id);
  return Number((result.rows[0] as { duration_ms: string }).duration_ms);
}
