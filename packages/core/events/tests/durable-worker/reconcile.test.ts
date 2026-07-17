import { beforeEach, expect, test } from "bun:test";
import {
  claimEventDeliveries,
  clearDurableEventDefinitions,
  completeEventDeliveryFailure,
  reconcileEventDeliveryRetries,
} from "../../src";
import { pool, resetWorkerStorage } from "./context";
import { deliveryRow, seedDelivery } from "./fixture";

beforeEach(async () => {
  await resetWorkerStorage();
  clearDurableEventDefinitions();
});

test("due retry promotion is bounded and records retry_ready", async () => {
  const first = await retryingDelivery();
  const second = await retryingDelivery();
  await pool.query(
    `UPDATE "_damat_event_deliveries"
     SET "available_at"=NOW()-INTERVAL '1 second' WHERE "id" IN ($1,$2)`,
    [first.id, second.id],
  );
  expect(await reconcileEventDeliveryRetries({ limit: 1 })).toBe(1);
  const statuses = [
    (await deliveryRow(first.id)).status,
    (await deliveryRow(second.id)).status,
  ];
  expect(statuses.filter((status) => status === "pending")).toHaveLength(1);
  const activity = await pool.query(
    `SELECT COUNT(*)::int AS count FROM "_damat_event_activity"
     WHERE "type"='retry_ready'`,
  );
  expect(activity.rows[0].count).toBe(1);
});

async function retryingDelivery() {
  const item = await seedDelivery({ maxAttempts: 2 });
  const [claim] = await claimEventDeliveries({
    consumers: [{ event: item.event, consumer: item.consumer }],
    workerId: "worker",
    limit: 1,
    leaseMs: 30_000,
  });
  await completeEventDeliveryFailure(claim!, new Error("retry"));
  return item;
}
