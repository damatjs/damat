import { beforeEach, expect, test } from "bun:test";
import { pauseWork } from "@damatjs/durability";
import {
  claimEventDeliveries,
  clearDurableEventDefinitions,
  encodeEventConsumerScope,
} from "../../src";
import { pool, resetWorkerStorage, uniqueEvent } from "./context";
import { seedDelivery } from "./fixture";

beforeEach(async () => {
  await resetWorkerStorage();
  clearDurableEventDefinitions();
});

test("claim is scoped to exact event and consumer identity", async () => {
  const first = await seedDelivery({ event: uniqueEvent("first") });
  const second = await seedDelivery({ event: uniqueEvent("second") });
  const claims = await claimEventDeliveries({
    consumers: [{ event: first.event, consumer: first.consumer }],
    workerId: "worker-a",
    limit: 10,
    leaseMs: 30_000,
  });
  expect(claims.map(({ id }) => id)).toEqual([first.id]);
  expect(await deliveryStatus(second.id)).toBe("pending");
});

test("claim atomically creates attempt and activity", async () => {
  const item = await seedDelivery();
  const [claim] = await claimEventDeliveries({
    consumers: [{ event: item.event, consumer: item.consumer }],
    workerId: "worker-a",
    limit: 1,
    leaseMs: 30_000,
  });
  expect(claim).toMatchObject({ attemptCount: 1, workerId: "worker-a" });
  const attempts = await pool.query(
    `SELECT COUNT(*)::int AS count FROM "_damat_event_delivery_attempts"
     WHERE "delivery_id"=$1`,
    [item.id],
  );
  expect(attempts.rows[0].count).toBe(1);
});

test("paused exact consumer scope is not claimable", async () => {
  const item = await seedDelivery();
  await pauseWork({
    kind: "event",
    scope: encodeEventConsumerScope(item.event, item.consumer),
    actor: { id: "test", type: "system" },
  });
  const claims = await claimEventDeliveries({
    consumers: [{ event: item.event, consumer: item.consumer }],
    workerId: "worker-a",
    limit: 1,
    leaseMs: 30_000,
  });
  expect(claims).toEqual([]);
});

async function deliveryStatus(id: string) {
  return (
    await pool.query(
      `SELECT "status" FROM "_damat_event_deliveries" WHERE "id"=$1`,
      [id],
    )
  ).rows[0].status;
}
