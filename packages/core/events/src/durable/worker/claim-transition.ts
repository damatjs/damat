import { createLeaseToken, type DurabilityExecutor } from "@damatjs/durability";
import { appendEventActivity } from "../repositories/activity";
import { mapEventDeliveryClaim } from "./claim-row";
import type { EventDeliveryClaimRow } from "./claim-row";
import type {
  ClaimEventDeliveriesOptions,
  ClaimedEventDelivery,
} from "./types";

export async function claimEventDeliveryRow(
  executor: DurabilityExecutor,
  row: EventDeliveryClaimRow,
  options: ClaimEventDeliveriesOptions,
): Promise<ClaimedEventDelivery> {
  const token = createLeaseToken();
  const result = await executor.query<EventDeliveryClaimRow>(
    `UPDATE "_damat_event_deliveries" SET "status"='running',
     "attempt_count"="attempt_count"+1,"lease_owner"=$2,"lease_token"=$3,
     "lease_expires_at"=NOW()+($4*INTERVAL '1 ms'),"heartbeat_at"=NOW(),
     "started_at"=COALESCE("started_at",NOW()),"updated_at"=NOW()
     WHERE "id"=$1 RETURNING *, $5::text AS "event_name",
       $6::jsonb AS "payload",$7::jsonb AS "metadata",
       $8::text AS "correlation_id",$9::text AS "causation_id",
       $10::text AS "previous_status"`,
    [
      row.id,
      options.workerId,
      token,
      options.leaseMs,
      row.event_name,
      JSON.stringify(row.payload),
      JSON.stringify(row.metadata),
      row.correlation_id,
      row.causation_id,
      row.previous_status,
    ],
  );
  const claim = mapEventDeliveryClaim(result.rows[0]!);
  await executor.query(
    `INSERT INTO "_damat_event_delivery_attempts"
     ("delivery_id","attempt_number","worker_id","lease_token","heartbeat_at")
     VALUES ($1,$2,$3,$4,NOW())`,
    [claim.id, claim.attemptCount, claim.workerId, claim.leaseToken],
  );
  await appendEventActivity(executor, {
    eventId: claim.eventId,
    deliveryId: claim.id,
    consumer: claim.consumer,
    attemptNumber: claim.attemptCount,
    type: "claimed",
    previousStatus: row.previous_status,
    nextStatus: "running",
    workerId: claim.workerId,
    leaseToken: claim.leaseToken,
  });
  return claim;
}
