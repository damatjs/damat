import {
  validateWorkActor,
  type DurabilityExecutor,
  type WorkActor,
} from "@damatjs/durability";
import { appendEventActivity } from "../repositories/activity";
import {
  mapDurableEventDelivery,
  type DurableEventDeliveryRow,
} from "../repositories/delivery-mappers";
import type { DurableEventDelivery } from "../repositories";
import {
  DurableEventNotFoundError,
  DurableEventTransitionError,
} from "./errors";
import type { ResolvedEventInspectionOptions } from "./options";

export function cancelInspectedDelivery(
  id: string,
  actor: WorkActor,
  reason: string | undefined,
  options: ResolvedEventInspectionOptions,
): Promise<DurableEventDelivery> {
  validateWorkActor(actor);
  return options.client.transaction((executor) =>
    cancelLocked(executor, id, actor, reason),
  );
}

async function cancelLocked(
  executor: DurabilityExecutor,
  id: string,
  actor: WorkActor,
  reason?: string,
): Promise<DurableEventDelivery> {
  const locked = await executor.query<DurableEventDeliveryRow>(
    `SELECT * FROM "_damat_event_deliveries" WHERE "id"=$1 FOR UPDATE`,
    [id],
  );
  const current = locked.rows[0];
  if (!current) throw new DurableEventNotFoundError(id);
  if (
    (current.status === "running" || current.status === "cancelled") &&
    current.cancellation_requested_at
  ) {
    return mapDurableEventDelivery(current);
  }
  const immediate =
    current.status === "pending" || current.status === "retry_wait";
  if (!immediate && current.status !== "running") {
    throw new DurableEventTransitionError(
      `Cannot cancel delivery "${id}" from ${current.status}`,
    );
  }
  const result = await executor.query<DurableEventDeliveryRow>(
    `UPDATE "_damat_event_deliveries" SET
       "status"=CASE WHEN $2 THEN 'cancelled' ELSE "status" END,
       "cancellation_requested_at"=NOW(),"updated_at"=NOW(),
       "completed_at"=CASE WHEN $2 THEN NOW() ELSE "completed_at" END
     WHERE "id"=$1 RETURNING *`,
    [id, immediate],
  );
  const delivery = mapDurableEventDelivery(result.rows[0]!);
  await appendEventActivity(executor, {
    eventId: current.event_id,
    deliveryId: id,
    consumer: current.consumer,
    type: immediate ? "cancelled" : "cancellation_requested",
    previousStatus: current.status,
    nextStatus: delivery.status,
    ...(reason ? { reason } : {}),
    actor: { ...actor },
  });
  return delivery;
}
