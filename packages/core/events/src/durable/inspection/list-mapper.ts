import { redactValue } from "@damatjs/durability";
import { mapDurableEvent } from "../repositories/mappers";
import type { DurableEventRecord } from "../repositories";
import type { DurableEventDeliveryStatus } from "../repositories";
import type { EventSummaryRow } from "./list-query";
import type { ResolvedEventInspectionOptions } from "./options";
import type { EventOperationalView, EventSummary } from "./types";

export function mapEventSummary(
  row: EventSummaryRow,
  options: ResolvedEventInspectionOptions,
): EventSummary {
  const event = mapDurableEvent(row);
  const counts = Object.fromEntries(
    Object.entries(row.delivery_counts).map(([key, value]) => [
      key,
      Number(value),
    ]),
  ) as Partial<Record<DurableEventDeliveryStatus, number>>;
  return createEventSummary(
    event,
    counts,
    row.recovered,
    options,
    row.view_flags,
  );
}

export function createEventSummary(
  event: DurableEventRecord,
  counts: Partial<Record<DurableEventDeliveryStatus, number>>,
  recovered: boolean,
  options: ResolvedEventInspectionOptions,
  views: EventOperationalView[],
): EventSummary {
  return {
    id: event.id,
    name: event.name,
    ...(options.visibility === "full"
      ? { payload: redactValue(event.payload, options.redaction) }
      : {}),
    ...(options.visibility !== "hidden"
      ? {
          metadata: redactValue(event.metadata, options.redaction) as Record<
            string,
            unknown
          >,
        }
      : {}),
    ...(event.correlationId ? { correlationId: event.correlationId } : {}),
    ...(event.causationId ? { causationId: event.causationId } : {}),
    ...(event.idempotencyKey ? { idempotencyKey: event.idempotencyKey } : {}),
    occurredAt: event.occurredAt,
    availableAt: event.availableAt,
    ...(event.routedAt ? { routedAt: event.routedAt } : {}),
    createdAt: event.createdAt,
    deliveryCounts: counts,
    views,
    recovered,
  };
}
