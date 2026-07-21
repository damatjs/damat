import type { DurableEventDelivery, DurableEventRecord } from "../repositories";
import type { EventOperationalView } from "./types";

type EventState = Pick<DurableEventRecord, "availableAt" | "routedAt">;
type DeliveryState = Pick<DurableEventDelivery, "availableAt" | "status">;

export function deriveEventViews(
  event: EventState,
  deliveries: DeliveryState[],
  now: Date,
): EventOperationalView[] {
  const has = (predicate: (delivery: DeliveryState) => boolean) =>
    deliveries.some(predicate);
  const pending = (delivery: DeliveryState) => delivery.status === "pending";
  const retry = (delivery: DeliveryState) => delivery.status === "retry_wait";
  const views: EventOperationalView[] = [];
  if (
    !event.routedAt ||
    event.availableAt > now ||
    has(
      (delivery) =>
        (pending(delivery) || retry(delivery)) && delivery.availableAt > now,
    )
  )
    views.push("upcoming");
  if (
    has(
      (delivery) =>
        delivery.status === "running" ||
        (pending(delivery) && delivery.availableAt <= now),
    )
  )
    views.push("processing");
  if (has(retry)) views.push("retrying");
  if (has((delivery) => delivery.status === "dead_lettered"))
    views.push("failed");
  const active = has((delivery) =>
    ["pending", "running", "retry_wait", "dead_lettered"].includes(
      delivery.status,
    ),
  );
  if (event.routedAt && !active) views.push("completed");
  return views;
}
