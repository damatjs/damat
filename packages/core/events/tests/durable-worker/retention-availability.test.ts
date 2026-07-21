import { beforeEach, expect, test } from "bun:test";
import {
  claimEventDeliveries,
  clearDurableEventDefinitions,
  completeEventDeliveryFailure,
  defineDurableEvent,
  defineDurableEventHandler,
  publishDurableEvent,
  reconcileExpiredEventDeliveryLeases,
  routeDurableEvents,
} from "../../src";
import { pool, resetWorkerStorage, uniqueEvent } from "./context";

beforeEach(async () => {
  await resetWorkerStorage();
  clearDurableEventDefinitions();
});

test("retry availability extends delivery retention", async () => {
  const claim = await seedShortRetention("retry");
  expect(await completeEventDeliveryFailure(claim, new Error("retry"))).toBe(
    "retry_wait",
  );
  await expectRetentionCoversAvailability(claim.id);
});

test("expired lease recovery extends pending delivery retention", async () => {
  const claim = await seedShortRetention("recovery");
  await pool.query(
    `UPDATE "_damat_event_deliveries"
     SET "lease_expires_at"=NOW()-INTERVAL '1 second' WHERE "id"=$1`,
    [claim.id],
  );
  expect(await reconcileExpiredEventDeliveryLeases({ limit: 1 })).toBe(1);
  await expectRetentionCoversAvailability(claim.id);
});

async function seedShortRetention(suffix: string) {
  const event = uniqueEvent(suffix);
  defineDurableEvent(event, {
    backoffMs: 1_000,
    maxAttempts: 2,
    retentionMs: 0,
  });
  defineDurableEventHandler(event, "consumer", () => {});
  await publishDurableEvent(event, {});
  await routeDurableEvents();
  const [claim] = await claimEventDeliveries({
    consumers: [{ event, consumer: "consumer" }],
    workerId: "short-retention-worker",
    limit: 1,
    leaseMs: 30_000,
  });
  return claim!;
}

async function expectRetentionCoversAvailability(id: string) {
  const row = await pool.query(
    `SELECT "status","available_at","retention_at"
     FROM "_damat_event_deliveries" WHERE "id"=$1`,
    [id],
  );
  expect(row.rows[0].retention_at.getTime()).toBeGreaterThanOrEqual(
    row.rows[0].available_at.getTime(),
  );
}
