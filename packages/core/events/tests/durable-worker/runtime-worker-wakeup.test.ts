import { beforeEach, expect, test } from "bun:test";
import {
  clearDurableEventDefinitions,
  defineDurableEventHandler,
  DurableEventWorker,
  EVENT_WAKEUP_CHANNEL,
  publishDurableEvent,
  routeDurableEvents,
  type EventWakeupConnection,
} from "../../src";
import { pool, resetWorkerStorage, uniqueEvent } from "./context";
import { waitUntil } from "./wait";

let listener: Parameters<EventWakeupConnection["on"]>[1] = () => {};
const connection: EventWakeupConnection = {
  subscribe: async () => {},
  unsubscribe: async () => {},
  quit: async () => {},
  on: (_event, value) => void (listener = value),
  off: () => {},
};

beforeEach(async () => {
  await resetWorkerStorage();
  clearDurableEventDefinitions();
});

test("worker delivery wake reaches its poll component", async () => {
  const event = uniqueEvent("worker-wake");
  defineDurableEventHandler(event, "consumer", () => {});
  const worker = new DurableEventWorker({
    consumers: [{ event, consumer: "consumer" }],
    pollIntervalMs: 60_000,
    wakeupRedis: { duplicate: () => connection },
  });
  worker.start();
  await Bun.sleep(10);
  const published = await publishDurableEvent(event, {});
  await routeDurableEvents();
  listener(
    EVENT_WAKEUP_CHANNEL,
    JSON.stringify({
      kind: "events",
      target: "delivery",
      event,
      consumer: "consumer",
    }),
  );
  await waitUntil(async () => {
    const row = await pool.query(
      `SELECT "status" FROM "_damat_event_deliveries" WHERE "event_id"=$1`,
      [published.id],
    );
    return row.rows[0]?.status === "succeeded";
  });
  await worker.stop();
  expect(worker.isRunning).toBe(false);
});
