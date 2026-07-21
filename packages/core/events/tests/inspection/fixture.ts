import * as events from "../../src";
import { ensureEventStorage, pool } from "../durable/storage-context";

export { pool };

export async function resetInspectionStorage(): Promise<void> {
  await ensureEventStorage();
  events.clearDurableEventDefinitions();
  events.clearEventWakeupPublisher();
  await pool.query(
    `TRUNCATE "_damat_event_activity", "_damat_event_logs",
      "_damat_event_delivery_attempts", "_damat_event_deliveries",
      "_damat_event_outbox", "_damat_work_control_activity",
      "_damat_work_controls", "_damat_maintenance_activity",
      "_damat_workers" CASCADE`,
  );
}

export async function seedEvent(consumers = ["alpha"]) {
  const name = `inspect.${crypto.randomUUID()}`;
  events.defineDurableEvent(name);
  for (const consumer of consumers) {
    events.defineDurableEventHandler(name, consumer, () => {});
  }
  const event = await events.publishDurableEvent(
    name,
    { visible: true, secret: "payload-secret" },
    {
      metadata: { public: "yes", secret: "metadata-secret" },
      correlationId: `correlation-${crypto.randomUUID()}`,
    },
  );
  await events.routeDurableEvents();
  const deliveries = await pool.query<{ id: string; consumer: string }>(
    `SELECT "id","consumer" FROM "_damat_event_deliveries"
     WHERE "event_id"=$1 ORDER BY "consumer"`,
    [event.id],
  );
  return { event, name, deliveries: deliveries.rows };
}

export function inspectionClient(options: Record<string, unknown> = {}) {
  const create = (events as Record<string, unknown>)[
    "createDurableEventInspectionClient"
  ] as (value: Record<string, unknown>) => any;
  return create({ cursorSigningKey: "inspection-secret", ...options });
}
