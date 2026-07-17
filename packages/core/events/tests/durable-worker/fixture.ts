import {
  defineDurableEvent,
  defineDurableEventHandler,
  publishDurableEvent,
  routeDurableEvents,
  type DurableEventHandler,
} from "../../src";
import { pool, uniqueEvent } from "./context";

export async function seedDelivery(
  options: {
    event?: string;
    consumer?: string;
    handler?: DurableEventHandler;
    maxAttempts?: number;
  } = {},
) {
  const event = options.event ?? uniqueEvent("delivery");
  const consumer = options.consumer ?? "consumer";
  defineDurableEvent(event, { maxAttempts: options.maxAttempts ?? 3 });
  defineDurableEventHandler(event, consumer, options.handler ?? (() => {}));
  const published = await publishDurableEvent(event, { value: 1 });
  await routeDurableEvents();
  const result = await pool.query(
    `SELECT "id" FROM "_damat_event_deliveries"
     WHERE "event_id"=$1 AND "consumer"=$2`,
    [published.id, consumer],
  );
  return { event, consumer, eventId: published.id, id: result.rows[0].id };
}

export async function deliveryRow(id: string) {
  const result = await pool.query(
    `SELECT * FROM "_damat_event_deliveries" WHERE "id"=$1`,
    [id],
  );
  return result.rows[0];
}
