import { beforeEach, expect, test } from "bun:test";
import {
  claimEventDeliveries,
  clearDurableEventDefinitions,
  executeEventDelivery,
  listDurableEventActivity,
  reconcileExpiredEventDeliveryLeases,
} from "../../src";
import { pool, resetWorkerStorage } from "./context";
import { seedDelivery } from "./fixture";

beforeEach(async () => {
  await resetWorkerStorage();
  clearDurableEventDefinitions();
});

test("failure activity includes reason and attempt duration", async () => {
  const item = await seedDelivery({
    maxAttempts: 1,
    handler: async () => {
      throw new Error("visible failure");
    },
  });
  const deliveryClaim = await claim(item);
  await executeEventDelivery(deliveryClaim);
  const activity = await latest(item.eventId, item.id);
  expect(activity).toMatchObject({
    deliveryId: item.id,
    consumer: item.consumer,
    attemptNumber: 1,
    previousStatus: "running",
    nextStatus: "dead_lettered",
    workerId: deliveryClaim.workerId,
    leaseToken: deliveryClaim.leaseToken,
    reason: "visible failure",
  });
  expect(activity.durationMs).toBeGreaterThanOrEqual(0);
});

test("lease recovery activity includes lost attempt duration", async () => {
  const item = await seedDelivery();
  const deliveryClaim = await claim(item);
  await pool.query(
    `UPDATE "_damat_event_deliveries"
     SET "lease_expires_at"=NOW()-INTERVAL '1 second' WHERE "id"=$1`,
    [item.id],
  );
  await reconcileExpiredEventDeliveryLeases();
  const activity = await latest(item.eventId, item.id);
  expect(activity).toMatchObject({
    type: "lease_recovered",
    deliveryId: item.id,
    consumer: item.consumer,
    attemptNumber: 1,
    previousStatus: "running",
    nextStatus: "pending",
    workerId: deliveryClaim.workerId,
    leaseToken: deliveryClaim.leaseToken,
    reason: "expired lease",
  });
  expect(activity.durationMs).toBeGreaterThanOrEqual(0);
});

async function claim(item: Awaited<ReturnType<typeof seedDelivery>>) {
  return (
    await claimEventDeliveries({
      consumers: [{ event: item.event, consumer: item.consumer }],
      workerId: "activity-worker",
      limit: 1,
      leaseMs: 30_000,
    })
  )[0]!;
}

async function latest(eventId: string, deliveryId: string) {
  const activity = await listDurableEventActivity(eventId);
  return activity.filter((item) => item.deliveryId === deliveryId).at(-1)!;
}
