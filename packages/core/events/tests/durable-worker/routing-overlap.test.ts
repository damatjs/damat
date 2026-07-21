import { beforeEach, expect, test } from "bun:test";
import {
  clearDurableEventDefinitions,
  defineDurableEvent,
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

test("overlapping and restarted routers do not duplicate fan-out", async () => {
  const name = uniqueEvent("overlap");
  defineDurableEventHandler(name, "consumer", async () => {});
  const event = await publishDurableEvent(name, {});
  await Promise.all([
    routeDurableEvents({ limit: 10 }),
    routeDurableEvents({ limit: 10 }),
  ]);
  await routeDurableEvents({ limit: 10 });
  const count = await pool.query(
    `SELECT COUNT(*)::int AS count FROM "_damat_event_deliveries"
     WHERE "event_id"=$1`,
    [event.id],
  );
  expect(count.rows[0].count).toBe(1);
  const activity = await listDurableEventActivity(event.id);
  expect(activity.filter(({ type }) => type === "routed")).toHaveLength(1);
  expect(activity.filter(({ type }) => type === "pending")).toHaveLength(1);
});

test("routing uses publish policy plus only explicit consumer overrides", async () => {
  const name = uniqueEvent("snapshot");
  defineDurableEvent(name, { maxAttempts: 4, backoffMs: 25 });
  defineDurableEventHandler(name, "consumer", async () => {}, {
    backoffMultiplier: 3,
  });
  const event = await publishDurableEvent(name, {});
  clearDurableEventDefinitions();
  defineDurableEvent(name, { maxAttempts: 9, backoffMs: 999 });
  defineDurableEventHandler(name, "consumer", async () => {}, {
    backoffMultiplier: 3,
  });
  await routeDurableEvents({ limit: 10 });
  const result = await pool.query(
    `SELECT "max_attempts","backoff_ms","backoff_multiplier"
     FROM "_damat_event_deliveries" WHERE "event_id"=$1`,
    [event.id],
  );
  expect(result.rows[0]).toMatchObject({
    max_attempts: 4,
    backoff_ms: "25",
    backoff_multiplier: 3,
  });
});

test("consumer membership is frozen when routing completes", async () => {
  const name = uniqueEvent("membership");
  const event = await publishDurableEvent(name, {});
  defineDurableEventHandler(name, "before", async () => {});
  await routeDurableEvents();
  defineDurableEventHandler(name, "after", async () => {});
  await routeDurableEvents();
  const rows = await pool.query(
    `SELECT "consumer" FROM "_damat_event_deliveries"
     WHERE "event_id"=$1 ORDER BY "consumer"`,
    [event.id],
  );
  expect(rows.rows.map(({ consumer }) => consumer)).toEqual(["before"]);
});
