import {
  getDurabilityClient,
  type DurabilityExecutor,
} from "@damatjs/durability";
import {
  recoverExpiredEventDeliveryLease,
  type ExpiredEventDeliveryLease,
} from "./lease-recovery";
import {
  encodeReconcileConsumers,
  resolveReconcileLimit,
  type EventReconcileOptions,
} from "./reconcile-options";

export async function reconcileExpiredEventDeliveryLeases(
  options: EventReconcileOptions = {},
): Promise<number> {
  const limit = resolveReconcileLimit(options.limit);
  const selected = encodeReconcileConsumers(options.consumers);
  if (options.executor) return recover(options.executor, limit, selected);
  return getDurabilityClient().transaction((executor) =>
    recover(executor, limit, selected),
  );
}

async function recover(
  executor: DurabilityExecutor,
  limit: number,
  selected: string | null,
): Promise<number> {
  const result = await executor.query<ExpiredEventDeliveryLease>(
    `SELECT d."id",d."event_id",d."consumer",d."attempt_count",
       d."max_attempts",d."cancellation_requested_at",d."lease_owner",
       d."lease_token" FROM "_damat_event_deliveries" d
     JOIN "_damat_event_outbox" o ON o."id"=d."event_id"
     WHERE d."status"='running' AND d."lease_expires_at"<=NOW()
       AND ($2::jsonb IS NULL OR EXISTS (SELECT 1
         FROM jsonb_to_recordset($2::jsonb) AS s(event text, consumer text)
         WHERE s.event=o."name" AND s.consumer=d."consumer"))
     ORDER BY d."lease_expires_at",d."id"
     FOR UPDATE OF d SKIP LOCKED LIMIT $1`,
    [limit, selected],
  );
  for (const row of result.rows) {
    await recoverExpiredEventDeliveryLease(executor, row);
  }
  return result.rows.length;
}
