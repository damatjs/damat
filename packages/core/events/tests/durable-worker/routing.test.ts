import { beforeEach, expect, test } from "bun:test";
import {
  clearDurableEventDefinitions,
  defineDurableEventHandler,
  listDurableEventActivity,
  publishDurableEvent,
  routeDurableEvents,
} from "../../src";
import { pool, resetWorkerStorage, uniqueEvent } from "./context";

beforeEach(async () => {
  await resetWorkerStorage();
  clearDurableEventDefinitions();
});

test("routing snapshots one delivery per named consumer", async () => {
  const name = uniqueEvent("routed");
  defineDurableEventHandler(name, "email", async () => {});
  defineDurableEventHandler(name, "audit", async () => {});
  const event = await publishDurableEvent(name, { id: "1" });
  expect(await routeDurableEvents({ limit: 10 })).toBe(1);
  const deliveries = await pool.query(
    `SELECT "consumer" FROM "_damat_event_deliveries"
     WHERE "event_id"=$1 ORDER BY "consumer"`,
    [event.id],
  );
  expect(deliveries.rows.map((row) => row.consumer)).toEqual([
    "audit",
    "email",
  ]);
  const activity = await listDurableEventActivity(event.id);
  expect(activity.map((row) => row.type)).toEqual([
    "published",
    "pending",
    "pending",
    "routed",
  ]);
  expect(activity.filter(({ type }) => type === "pending")).toMatchObject([
    {
      consumer: "email",
      nextStatus: "pending",
      deliveryId: expect.any(String),
    },
    {
      consumer: "audit",
      nextStatus: "pending",
      deliveryId: expect.any(String),
    },
  ]);
});

test("an event with no consumer is routed and remains inspectable", async () => {
  const event = await publishDurableEvent(uniqueEvent("orphan"), {});
  expect(await routeDurableEvents({ limit: 10 })).toBe(1);
  const routed = await pool.query(
    `SELECT "routed_at" FROM "_damat_event_outbox" WHERE "id"=$1`,
    [event.id],
  );
  expect(routed.rows[0].routed_at).toBeInstanceOf(Date);
  expect(
    (await listDurableEventActivity(event.id)).map((row) => row.type),
  ).toEqual(["published", "routed"]);
  expect(await routeDurableEvents({ limit: 10 })).toBe(0);
});
