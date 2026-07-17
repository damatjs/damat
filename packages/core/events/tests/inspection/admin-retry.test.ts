import { beforeEach, expect, test } from "bun:test";
import { configureEventWakeupPublisher } from "../../src";
import {
  inspectionClient,
  pool,
  resetInspectionStorage,
  seedEvent,
} from "./fixture";

beforeEach(resetInspectionStorage);
const actor = { id: "operator-2", type: "service" as const };

test("retries a dead letter, advances retention, and wakes after commit", async () => {
  const seeded = await seedEvent();
  const delivery = seeded.deliveries[0]!;
  await pool.query(
    `UPDATE "_damat_event_outbox" SET "available_at"=NOW()-INTERVAL '2 hours',
       "retention_at"=NOW()-INTERVAL '1 hour'
     WHERE "id"=$1`,
    [seeded.event.id],
  );
  await pool.query(
    `UPDATE "_damat_event_deliveries" SET "status"='dead_lettered',
       "available_at"=NOW()-INTERVAL '2 hours',
       "completed_at"=NOW(),"retention_at"=NOW()+INTERVAL '30 days',
       "progress"='{"step":1}',"result"='{"old":true}',
       "last_error"='{"message":"old"}',"cancellation_requested_at"=NOW(),
       "lease_owner"='old-worker',"lease_token"=$2,
       "lease_expires_at"=NOW()+INTERVAL '1 hour',"heartbeat_at"=NOW()
     WHERE "id"=$1`,
    [delivery.id, crypto.randomUUID()],
  );
  const before = await pool.query(
    `SELECT "retention_at" FROM "_damat_event_deliveries" WHERE "id"=$1`,
    [delivery.id],
  );
  let committed = false;
  let message = "";
  configureEventWakeupPublisher({
    publish: async (_channel, value) => {
      message = value;
      const row = await pool.query(
        `SELECT "status" FROM "_damat_event_deliveries" WHERE "id"=$1`,
        [delivery.id],
      );
      committed = row.rows[0].status === "pending";
      return 1;
    },
  });

  const retried = await inspectionClient().retryDelivery(delivery.id, actor);

  expect(retried.status).toBe("pending");
  expect(retried.retentionAt.getTime()).toBeGreaterThanOrEqual(
    before.rows[0].retention_at.getTime(),
  );
  expect(retried).not.toHaveProperty("progress");
  expect(retried).not.toHaveProperty("result");
  expect(retried).not.toHaveProperty("lastError");
  expect(retried).not.toHaveProperty("leaseOwner");
  expect(committed).toBe(true);
  expect(JSON.parse(message)).toMatchObject({
    target: "delivery",
    event: seeded.name,
    consumer: delivery.consumer,
  });
  await expect(
    inspectionClient().retryDelivery(delivery.id, actor),
  ).rejects.toHaveProperty("name", "DurableEventTransitionError");
  const activity = await pool.query(
    `SELECT "actor","metadata" FROM "_damat_event_activity"
     WHERE "delivery_id"=$1 AND "type"='manual_retry'`,
    [delivery.id],
  );
  expect(activity.rows[0].actor).toEqual(actor);
  expect(activity.rows[0].metadata.availableAt).toBeString();
});
