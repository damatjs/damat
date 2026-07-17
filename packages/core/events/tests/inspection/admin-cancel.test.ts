import { beforeEach, expect, test } from "bun:test";
import {
  inspectionClient,
  pool,
  resetInspectionStorage,
  seedEvent,
} from "./fixture";

beforeEach(resetInspectionStorage);
const actor = { id: "operator-1", type: "user" as const };

test("cancels waiting delivery and audits the actor atomically", async () => {
  const seeded = await seedEvent();
  const delivery = seeded.deliveries[0]!;

  const client = inspectionClient();
  const cancelled = await client.cancelDelivery(
    delivery.id,
    actor,
    "not needed",
  );
  const repeated = await client.cancelDelivery(delivery.id, actor);

  expect(cancelled.status).toBe("cancelled");
  expect(repeated.status).toBe("cancelled");
  const activity = await pool.query(
    `SELECT "type","actor","reason" FROM "_damat_event_activity"
     WHERE "delivery_id"=$1 AND "type"='cancelled'`,
    [delivery.id],
  );
  expect(activity.rows).toHaveLength(1);
  expect(activity.rows[0]).toMatchObject({
    type: "cancelled",
    actor,
    reason: "not needed",
  });
});

test("running cancellation is idempotent and records one request", async () => {
  const seeded = await seedEvent();
  const delivery = seeded.deliveries[0]!;
  await pool.query(
    `UPDATE "_damat_event_deliveries" SET "status"='running',
     "lease_owner"='worker-a',"lease_token"=$2,"lease_expires_at"=NOW()+INTERVAL '1 hour'
     WHERE "id"=$1`,
    [delivery.id, crypto.randomUUID()],
  );
  const client = inspectionClient();

  await client.cancelDelivery(delivery.id, actor);
  const repeated = await client.cancelDelivery(delivery.id, actor);

  expect(repeated.cancellationRequestedAt).toBeInstanceOf(Date);
  const count = await pool.query(
    `SELECT COUNT(*)::int AS "total" FROM "_damat_event_activity"
     WHERE "delivery_id"=$1 AND "type"='cancellation_requested'`,
    [delivery.id],
  );
  expect(count.rows[0].total).toBe(1);
});

test("validates actors before querying", () => {
  expect(() =>
    inspectionClient().cancelDelivery(crypto.randomUUID(), undefined),
  ).toThrow("actor is required");
});

test("rejects cancellation of an unrelated terminal state", async () => {
  const seeded = await seedEvent();
  const delivery = seeded.deliveries[0]!;
  await pool.query(
    `UPDATE "_damat_event_deliveries" SET "status"='succeeded',
       "completed_at"=NOW() WHERE "id"=$1`,
    [delivery.id],
  );
  await expect(
    inspectionClient().cancelDelivery(delivery.id, actor),
  ).rejects.toHaveProperty("name", "DurableEventTransitionError");
});
