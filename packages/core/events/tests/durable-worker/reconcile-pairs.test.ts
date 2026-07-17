import { beforeEach, expect, test } from "bun:test";
import {
  claimEventDeliveries,
  clearDurableEventDefinitions,
  reconcileEventDeliveryRetries,
  reconcileExpiredEventDeliveryLeases,
} from "../../src";
import { pool, resetWorkerStorage } from "./context";
import { deliveryRow, seedDelivery } from "./fixture";

beforeEach(async () => {
  await resetWorkerStorage();
  clearDurableEventDefinitions();
});

test("lease reconciliation scopes exact event-consumer pairs", async () => {
  const [left, right] = await crossedDeliveries();
  for (const item of [left, right]) {
    await claimEventDeliveries({
      consumers: [{ event: item.event, consumer: item.consumer }],
      workerId: "expired",
      limit: 1,
      leaseMs: 30_000,
    });
  }
  await expire([left.id, right.id]);
  expect(
    await reconcileExpiredEventDeliveryLeases({
      consumers: crossedScope(left, right),
      limit: 10,
    }),
  ).toBe(0);
  expect((await deliveryRow(left.id)).status).toBe("running");
  expect((await deliveryRow(right.id)).status).toBe("running");
});

test("retry reconciliation scopes exact event-consumer pairs", async () => {
  const [left, right] = await crossedDeliveries();
  await pool.query(
    `UPDATE "_damat_event_deliveries" SET "status"='retry_wait',
     "available_at"=NOW()-INTERVAL '1 second' WHERE "id"=ANY($1::uuid[])`,
    [[left.id, right.id]],
  );
  expect(
    await reconcileEventDeliveryRetries({
      consumers: crossedScope(left, right),
      limit: 10,
    }),
  ).toBe(0);
  expect((await deliveryRow(left.id)).status).toBe("retry_wait");
  expect((await deliveryRow(right.id)).status).toBe("retry_wait");
});

async function crossedDeliveries() {
  return [
    await seedDelivery({ consumer: "left" }),
    await seedDelivery({ consumer: "right" }),
  ] as const;
}

function crossedScope(
  left: Awaited<ReturnType<typeof seedDelivery>>,
  right: Awaited<ReturnType<typeof seedDelivery>>,
) {
  return [
    { event: left.event, consumer: right.consumer },
    { event: right.event, consumer: left.consumer },
  ];
}

async function expire(ids: string[]) {
  await pool.query(
    `UPDATE "_damat_event_deliveries"
     SET "lease_expires_at"=NOW()-INTERVAL '1 second'
     WHERE "id"=ANY($1::uuid[])`,
    [ids],
  );
}
