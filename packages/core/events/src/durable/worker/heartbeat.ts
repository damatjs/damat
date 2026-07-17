import { getDurabilityClient } from "@damatjs/durability";
import { EventDeliveryLeaseLostError } from "./errors";
import type { ClaimedEventDelivery } from "./types";

export async function heartbeatEventDelivery(
  claim: ClaimedEventDelivery,
  options: { leaseMs: number },
): Promise<{ cancellationRequested: boolean }> {
  if (!Number.isSafeInteger(options.leaseMs) || options.leaseMs < 1) {
    throw new Error("leaseMs must be a positive safe integer");
  }
  return getDurabilityClient().transaction(async (executor) => {
    const delivery = await executor.query<{ cancellation_requested: boolean }>(
      `UPDATE "_damat_event_deliveries" SET "heartbeat_at"=NOW(),
       "lease_expires_at"=NOW()+($4*INTERVAL '1 ms'),"updated_at"=NOW()
       WHERE "id"=$1 AND "status"='running' AND "lease_owner"=$2
         AND "lease_token"=$3 AND "lease_expires_at">NOW()
         AND "event_id"=$5 AND "consumer"=$6
       RETURNING "cancellation_requested_at" IS NOT NULL
         AS "cancellation_requested"`,
      [
        claim.id,
        claim.workerId,
        claim.leaseToken,
        options.leaseMs,
        claim.eventId,
        claim.consumer,
      ],
    );
    const row = delivery.rows[0];
    if (!row) throw new EventDeliveryLeaseLostError(claim.id);
    const attempt = await executor.query(
      `UPDATE "_damat_event_delivery_attempts" SET "heartbeat_at"=NOW()
       WHERE "delivery_id"=$1 AND "attempt_number"=$2 AND "lease_token"=$3
         AND "finished_at" IS NULL RETURNING 1`,
      [claim.id, claim.attemptCount, claim.leaseToken],
    );
    if (attempt.rowCount !== 1) throw new EventDeliveryLeaseLostError(claim.id);
    return { cancellationRequested: row.cancellation_requested };
  });
}
