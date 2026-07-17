import type { DurabilityExecutor } from "@damatjs/durability";
import type { DurableEventDeliveryRow } from "../repositories/delivery-mappers";

export async function updateDeliveryForRetry(
  executor: DurabilityExecutor,
  row: DurableEventDeliveryRow,
  retentionMs: number,
): Promise<DurableEventDeliveryRow> {
  await executor.query(
    `UPDATE "_damat_event_outbox" SET
       "retention_at"=GREATEST("retention_at",NOW()+($2*INTERVAL '1 ms'))
     WHERE "id"=$1`,
    [row.event_id, retentionMs],
  );
  const result = await executor.query<DurableEventDeliveryRow>(
    `UPDATE "_damat_event_deliveries" SET "status"='pending',
       "available_at"=NOW(),"retention_at"=GREATEST("retention_at",
         NOW()+($2*INTERVAL '1 ms')),
       "completed_at"=NULL,"cancellation_requested_at"=NULL,
       "progress"=NULL,"result"=NULL,"last_error"=NULL,
       "lease_owner"=NULL,"lease_token"=NULL,"lease_expires_at"=NULL,
       "heartbeat_at"=NULL,"updated_at"=NOW()
     WHERE "id"=$1 RETURNING *`,
    [row.id, retentionMs],
  );
  return result.rows[0]!;
}
