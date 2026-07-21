import { beforeEach, expect, test } from "bun:test";
import {
  claimEventDeliveries,
  clearDurableEventDefinitions,
  reconcileExpiredEventDeliveryLeases,
} from "../../src";
import { pool, resetWorkerStorage } from "./context";
import { deliveryRow, seedDelivery } from "./fixture";

beforeEach(async () => {
  await resetWorkerStorage();
  clearDurableEventDefinitions();
});

test("expired lease recovery preserves lost attempt identity", async () => {
  const item = await seedDelivery();
  const [claim] = await claimEventDeliveries({
    consumers: [{ event: item.event, consumer: item.consumer }],
    workerId: "dead-worker",
    limit: 1,
    leaseMs: 30_000,
  });
  await pool.query(
    `UPDATE "_damat_event_deliveries"
     SET "lease_expires_at"=NOW()-INTERVAL '1 second' WHERE "id"=$1`,
    [item.id],
  );
  expect(await reconcileExpiredEventDeliveryLeases({ limit: 10 })).toBe(1);
  expect((await deliveryRow(item.id)).status).toBe("pending");
  const activity = await pool.query(
    `SELECT "worker_id","lease_token","type" FROM "_damat_event_activity"
     WHERE "delivery_id"=$1 ORDER BY "id" DESC LIMIT 1`,
    [item.id],
  );
  expect(activity.rows[0]).toMatchObject({
    worker_id: "dead-worker",
    lease_token: claim!.leaseToken,
    type: "lease_recovered",
  });
});

test("claim path uses the same expired lease recovery transition", async () => {
  const item = await seedDelivery();
  await claimEventDeliveries({
    consumers: [{ event: item.event, consumer: item.consumer }],
    workerId: "old-worker",
    limit: 1,
    leaseMs: 30_000,
  });
  await pool.query(
    `UPDATE "_damat_event_deliveries"
     SET "lease_expires_at"=NOW()-INTERVAL '1 second' WHERE "id"=$1`,
    [item.id],
  );
  const [reclaimed] = await claimEventDeliveries({
    consumers: [{ event: item.event, consumer: item.consumer }],
    workerId: "new-worker",
    limit: 1,
    leaseMs: 30_000,
  });
  expect(reclaimed).toMatchObject({ attemptCount: 2, workerId: "new-worker" });
  const types = await pool.query(
    `SELECT "type" FROM "_damat_event_activity"
     WHERE "delivery_id"=$1 ORDER BY "id"`,
    [item.id],
  );
  expect(types.rows.map(({ type }) => type)).toContain("lease_recovered");
});
