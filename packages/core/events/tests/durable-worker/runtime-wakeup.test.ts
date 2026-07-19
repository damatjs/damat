import { beforeEach, expect, test } from "bun:test";
import {
  clearDurableEventDefinitions,
  DurableEventRouter,
  EVENT_WAKEUP_CHANNEL,
  publishDurableEvent,
  type EventWakeupConnection,
} from "../../src";
import { durability, pool, resetWorkerStorage, uniqueEvent } from "./context";
import { waitUntil } from "./wait";

let listener: ((channel: string, message: string) => void) | undefined;
const connection: EventWakeupConnection = {
  subscribe: async () => {},
  unsubscribe: async () => {},
  quit: async () => {},
  on: (event, value) => {
    if (event === "message") listener = value as typeof listener;
  },
  off: () => {},
};
const redis = { duplicate: () => connection };

beforeEach(async () => {
  await resetWorkerStorage();
  clearDurableEventDefinitions();
  listener = undefined;
});

test("router wake-up triggers immediate poll", async () => {
  const router = new DurableEventRouter({
    pollIntervalMs: 60_000,
    retryIntervalMs: 10,
    wakeupRedis: redis,
  });
  router.start();
  await waitUntil(() => listener !== undefined);
  const event = await durability.transaction((executor) =>
    publishDurableEvent(uniqueEvent("immediate"), {}, { executor }),
  );
  listener!(EVENT_WAKEUP_CHANNEL, '{"kind":"events","target":"router"}');
  await waitUntil(() => routed(event.id));
  await router.stop();
  expect(await routed(event.id)).toBe(true);
});

test("periodic PostgreSQL polling continues with Redis connected", async () => {
  const router = new DurableEventRouter({
    pollIntervalMs: 20,
    retryIntervalMs: 10,
    wakeupRedis: redis,
  });
  router.start();
  const event = await durability.transaction((executor) =>
    publishDurableEvent(uniqueEvent("polling"), {}, { executor }),
  );
  await waitUntil(() => routed(event.id));
  await router.stop();
  expect(await routed(event.id)).toBe(true);
});

async function routed(id: string): Promise<boolean> {
  const row = await pool.query(
    `SELECT "routed_at" FROM "_damat_event_outbox" WHERE "id"=$1`,
    [id],
  );
  return row.rows[0].routed_at instanceof Date;
}
