import { beforeEach, expect, test } from "bun:test";
import {
  claimEventDeliveries,
  clearDurableEventDefinitions,
  defineDurableEvent,
  defineDurableEventHandler,
  executeEventDelivery,
  publishDurableEvent,
  routeDurableEvents,
} from "../../src";
import { pool, resetWorkerStorage, uniqueEvent } from "./context";
import { deliveryRow, seedDelivery } from "./fixture";

beforeEach(async () => {
  await resetWorkerStorage();
  clearDurableEventDefinitions();
});

test("consumers complete independently", async () => {
  const event = uniqueEvent("independent");
  defineDurableEvent(event, { maxAttempts: 1 });
  defineDurableEventHandler(event, "good", async () => {});
  defineDurableEventHandler(event, "bad", async () => {
    throw new Error("failed");
  });
  const published = await publishDurableEvent(event, {});
  await routeDurableEvents();
  const claims = await claimEventDeliveries({
    consumers: [
      { event, consumer: "good" },
      { event, consumer: "bad" },
    ],
    workerId: "worker-a",
    limit: 10,
    leaseMs: 30_000,
  });
  for (const claim of claims) await executeEventDelivery(claim);
  const rows = await pool.query(
    `SELECT "consumer","status" FROM "_damat_event_deliveries"
     WHERE "event_id"=$1 ORDER BY "consumer"`,
    [published.id],
  );
  expect(rows.rows).toMatchObject([
    { consumer: "bad", status: "dead_lettered" },
    { consumer: "good", status: "succeeded" },
  ]);
});

test("missing selected handler dead-letters visibly", async () => {
  const item = await seedDelivery({ maxAttempts: 3 });
  clearDurableEventDefinitions();
  const [claim] = await claimEventDeliveries({
    consumers: [{ event: item.event, consumer: item.consumer }],
    workerId: "worker-a",
    limit: 1,
    leaseMs: 30_000,
  });
  await executeEventDelivery(claim!);
  expect(await deliveryRow(item.id)).toMatchObject({
    status: "dead_lettered",
    last_error: { message: expect.stringContaining("Unknown") },
  });
  const activity = await pool.query(
    `SELECT "type" FROM "_damat_event_activity"
     WHERE "delivery_id"=$1 ORDER BY "id" DESC LIMIT 1`,
    [item.id],
  );
  expect(activity.rows[0].type).toBe("dead_lettered");
});
