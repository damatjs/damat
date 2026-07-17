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

test("expired cancellation becomes cancelled", async () => {
  const item = await seedDelivery();
  await claimAndExpire(item, true);
  expect(await reconcileExpiredEventDeliveryLeases({ limit: 10 })).toBe(1);
  expect(await deliveryRow(item.id)).toMatchObject({ status: "cancelled" });
});

test("exhausted recovery dead-letters and closes the lost attempt identity", async () => {
  const item = await seedDelivery({ maxAttempts: 1 });
  const claim = await claimAndExpire(item, false);
  expect(await reconcileExpiredEventDeliveryLeases({ limit: 10 })).toBe(1);
  expect(await deliveryRow(item.id)).toMatchObject({ status: "dead_lettered" });
  const attempt = await pool.query(
    `SELECT "attempt_number","worker_id","lease_token","outcome","finished_at"
     FROM "_damat_event_delivery_attempts" WHERE "delivery_id"=$1`,
    [item.id],
  );
  expect(attempt.rows[0]).toMatchObject({
    attempt_number: claim.attemptCount,
    worker_id: claim.workerId,
    lease_token: claim.leaseToken,
    outcome: "lost",
  });
  expect(attempt.rows[0].finished_at).toBeInstanceOf(Date);
});

async function claimAndExpire(
  item: Awaited<ReturnType<typeof seedDelivery>>,
  cancel: boolean,
) {
  const [claim] = await claimEventDeliveries({
    consumers: [{ event: item.event, consumer: item.consumer }],
    workerId: "lost-worker",
    limit: 1,
    leaseMs: 30_000,
  });
  await pool.query(
    `UPDATE "_damat_event_deliveries" SET "lease_expires_at"=NOW()-INTERVAL '1 second',
     "cancellation_requested_at"=CASE WHEN $2 THEN NOW() ELSE NULL END
     WHERE "id"=$1`,
    [item.id, cancel],
  );
  return claim!;
}
