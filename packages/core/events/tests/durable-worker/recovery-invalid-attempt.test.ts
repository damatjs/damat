import { beforeEach, expect, test } from "bun:test";
import {
  claimEventDeliveries,
  clearDurableEventDefinitions,
  reconcileExpiredEventDeliveryLeases,
} from "../../src";
import { pool, resetWorkerStorage } from "./context";
import { seedDelivery } from "./fixture";

beforeEach(async () => {
  await resetWorkerStorage();
  clearDurableEventDefinitions();
});

test("expired recovery rejects a delivery without an active attempt", async () => {
  const item = await seedDelivery();
  await claimEventDeliveries({
    consumers: [{ event: item.event, consumer: item.consumer }],
    workerId: "invalid-attempt-worker",
    limit: 1,
    leaseMs: 30_000,
  });
  await pool.query(
    `UPDATE "_damat_event_delivery_attempts" SET "finished_at"=NOW()
     WHERE "delivery_id"=$1`,
    [item.id],
  );
  await pool.query(
    `UPDATE "_damat_event_deliveries"
     SET "lease_expires_at"=NOW()-INTERVAL '1 second' WHERE "id"=$1`,
    [item.id],
  );
  await expect(reconcileExpiredEventDeliveryLeases()).rejects.toThrow(
    /no active attempt/,
  );
});
