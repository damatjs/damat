import { beforeEach, expect, test } from "bun:test";
import {
  claimEventDeliveries,
  clearDurableEventDefinitions,
  completeEventDeliverySuccess,
  defineDurableEvent,
  defineDurableEventHandler,
  DurableEventWorker,
  publishDurableEvent,
  routeDurableEvents,
} from "../../src";
import { pool, resetWorkerStorage, uniqueEvent } from "./context";
import { waitUntil } from "./wait";

beforeEach(async () => {
  await resetWorkerStorage();
  clearDurableEventDefinitions();
});

test("worker retention cleans terminal events shared with other workers", async () => {
  const event = uniqueEvent("split-retention");
  defineDurableEvent(event);
  defineDurableEventHandler(event, "left", () => {});
  defineDurableEventHandler(event, "right", () => {});
  const published = await publishDurableEvent(event, {});
  await routeDurableEvents();
  const claims = await claimEventDeliveries({
    consumers: ["left", "right"].map((consumer) => ({ event, consumer })),
    workerId: "terminal-worker",
    limit: 2,
    leaseMs: 30_000,
  });
  await Promise.all(
    claims.map((claim) => completeEventDeliverySuccess(claim, undefined)),
  );
  await pool.query(
    `UPDATE "_damat_event_outbox"
     SET "available_at"=NOW()-INTERVAL '2 hours',
         "retention_at"=NOW()-INTERVAL '1 hour'
     WHERE "id"=$1`,
    [published.id],
  );
  const worker = new DurableEventWorker({
    consumers: [{ event, consumer: "left" }],
    pollIntervalMs: 10,
    reconcileIntervalMs: 10,
    retentionIntervalMs: 10,
  });
  worker.start();
  try {
    await waitUntil(async () => {
      const row = await pool.query(
        `SELECT 1 FROM "_damat_event_outbox" WHERE "id"=$1`,
        [published.id],
      );
      return row.rowCount === 0;
    });
  } finally {
    await worker.stop();
  }
  expect(claims).toHaveLength(2);
});
