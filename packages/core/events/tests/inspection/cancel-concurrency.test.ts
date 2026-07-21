import { beforeEach, expect, test } from "bun:test";
import { claimEventDeliveries, completeEventDeliverySuccess } from "../../src";
import {
  inspectionClient,
  pool,
  resetInspectionStorage,
  seedEvent,
} from "./fixture";

beforeEach(resetInspectionStorage);
const actor = { id: "operator", type: "user" as const };

test("concurrent cancel and retry serialize without deadlock", async () => {
  const seeded = await seedEvent();
  const delivery = seeded.deliveries[0]!;
  const client = inspectionClient();

  const [cancelled, retried] = await Promise.allSettled([
    client.cancelDelivery(delivery.id, actor),
    client.retryDelivery(delivery.id, actor),
  ]);

  expect(cancelled).toMatchObject({
    status: "fulfilled",
    value: { status: "cancelled" },
  });
  expect(retried).toMatchObject({
    status: "rejected",
    reason: { name: "DurableEventTransitionError" },
  });
  const activity = await pool.query(
    `SELECT "type" FROM "_damat_event_activity"
     WHERE "delivery_id"=$1 AND "type" IN ('cancelled','manual_retry')`,
    [delivery.id],
  );
  expect(activity.rows).toEqual([{ type: "cancelled" }]);
});

test("concurrent cancel and worker finish serialize without deadlock", async () => {
  const seeded = await seedEvent();
  const delivery = seeded.deliveries[0]!;
  const [claim] = await claimEventDeliveries({
    consumers: [{ event: seeded.name, consumer: delivery.consumer }],
    workerId: "worker-a",
    limit: 1,
    leaseMs: 30_000,
  });

  const results = await Promise.allSettled([
    inspectionClient().cancelDelivery(delivery.id, actor),
    completeEventDeliverySuccess(claim!, { ok: true }),
  ]);

  expect(results.every((result) => !isDeadlock(result))).toBe(true);
  const row = await pool.query(
    `SELECT "status" FROM "_damat_event_deliveries" WHERE "id"=$1`,
    [delivery.id],
  );
  expect(["cancelled", "succeeded"]).toContain(row.rows[0].status);
});

function isDeadlock(result: PromiseSettledResult<unknown>) {
  return (
    result.status === "rejected" &&
    String(result.reason?.message ?? result.reason).includes("deadlock")
  );
}
