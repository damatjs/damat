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
import { publishEventConsumerWakeup } from "../wakeup";
import {
  DurableEventNotFoundError,
  DurableEventTransitionError,
} from "./errors";
import type { ResolvedEventInspectionOptions } from "./options";
import { updateDeliveryForRetry } from "./retry-update";

interface RetryResult {
  delivery: DurableEventDelivery;
  event: string;
}

export async function retryInspectedDelivery(
  id: string,
  actor: WorkActor,
  options: ResolvedEventInspectionOptions,
): Promise<DurableEventDelivery> {
  validateWorkActor(actor);
  const result = await options.client.transaction((executor) =>
    retryLocked(executor, id, actor),
  );
  await publishEventConsumerWakeup(result.event, result.delivery.consumer);
  return result.delivery;
}

async function retryLocked(
  executor: DurabilityExecutor,
  id: string,
  actor: WorkActor,
): Promise<RetryResult> {
  const locked = await executor.query<DurableEventDeliveryRow>(
    `SELECT * FROM "_damat_event_deliveries" WHERE "id"=$1 FOR UPDATE`,
    [id],
  );
  const current = locked.rows[0];
  if (!current) throw new DurableEventNotFoundError(id);
  if (current.status !== "dead_lettered") {
    throw new DurableEventTransitionError(
      `Cannot retry delivery "${id}" from ${current.status}`,
    );
  }
  const event = await executor.query<{
    name: string;
    retention_ms: string;
  }>(
    `SELECT "name","retention_ms" FROM "_damat_event_outbox"
     WHERE "id"=$1 FOR UPDATE`,
    [current.event_id],
  );
  if (!event.rows[0]) throw new DurableEventNotFoundError(id);
  const row = await updateDeliveryForRetry(
    executor,
    current,
    +event.rows[0].retention_ms,
  );
  await appendEventActivity(executor, {
    eventId: current.event_id,
    deliveryId: id,
    consumer: current.consumer,
    type: "manual_retry",
    previousStatus: "dead_lettered",
    nextStatus: "pending",
    actor: { ...actor },
    metadata: { availableAt: row.available_at.toISOString() },
  });
  return { delivery: mapDurableEventDelivery(row), event: event.rows[0].name };
}
