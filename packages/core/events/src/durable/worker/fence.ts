import type { DurabilityExecutor } from "@damatjs/durability";
import { EventDeliveryLeaseLostError } from "./errors";
import type { ClaimedEventDelivery } from "./types";

export async function assertCurrentEventDeliveryLease(
  executor: DurabilityExecutor,
  claim: ClaimedEventDelivery,
): Promise<void> {
  const result = await executor.query(
    `SELECT 1 FROM "_damat_event_deliveries"
     WHERE "id"=$1 AND "event_id"=$4 AND "consumer"=$5
       AND "status"='running' AND "lease_owner"=$2 AND "lease_token"=$3
       AND "lease_expires_at">NOW() FOR UPDATE`,
    [claim.id, claim.workerId, claim.leaseToken, claim.eventId, claim.consumer],
  );
  if (result.rowCount !== 1) throw new EventDeliveryLeaseLostError(claim.id);
}
