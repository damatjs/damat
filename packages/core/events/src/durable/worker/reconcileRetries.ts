import {
  getDurabilityClient,
  type DurabilityExecutor,
} from "@damatjs/durability";
import { appendEventActivity } from "../repositories/activity";
import {
  encodeReconcileConsumers,
  resolveReconcileLimit,
  type EventReconcileOptions,
} from "./reconcile-options";

interface RetryDeliveryRow {
  id: string;
  event_id: string;
  consumer: string;
  available_at: Date;
}

export async function reconcileEventDeliveryRetries(
  options: EventReconcileOptions = {},
): Promise<number> {
  const limit = resolveReconcileLimit(options.limit);
  const selected = encodeReconcileConsumers(options.consumers);
  if (options.executor) return promote(options.executor, limit, selected);
  return getDurabilityClient().transaction((executor) =>
    promote(executor, limit, selected),
  );
}

async function promote(
  executor: DurabilityExecutor,
  limit: number,
  selected: string | null,
): Promise<number> {
  const result = await executor.query<RetryDeliveryRow>(
    `SELECT d."id",d."event_id",d."consumer",d."available_at"
     FROM "_damat_event_deliveries" d JOIN "_damat_event_outbox" o
       ON o."id"=d."event_id" WHERE d."status"='retry_wait'
       AND d."available_at"<=NOW() AND ($2::jsonb IS NULL OR EXISTS
         (SELECT 1 FROM jsonb_to_recordset($2::jsonb)
          AS s(event text, consumer text)
          WHERE s.event=o."name" AND s.consumer=d."consumer"))
     ORDER BY d."available_at",d."id"
     FOR UPDATE OF d SKIP LOCKED LIMIT $1`,
    [limit, selected],
  );
  for (const row of result.rows) {
    await executor.query(
      `UPDATE "_damat_event_deliveries" SET "status"='pending',
       "updated_at"=NOW() WHERE "id"=$1 AND "status"='retry_wait'`,
      [row.id],
    );
    await appendEventActivity(executor, {
      eventId: row.event_id,
      deliveryId: row.id,
      consumer: row.consumer,
      type: "retry_ready",
      previousStatus: "retry_wait",
      nextStatus: "pending",
      metadata: { availableAt: row.available_at.toISOString() },
    });
  }
  return result.rows.length;
}
