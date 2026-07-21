import { beforeEach, expect, test } from "bun:test";
import { claimEventDeliveries, clearDurableEventDefinitions } from "../../src";
import { pool, resetWorkerStorage } from "./context";
import { seedDelivery } from "./fixture";

beforeEach(async () => {
  await resetWorkerStorage();
  clearDurableEventDefinitions();
});

test("overlapping workers claim disjoint due deliveries", async () => {
  const deliveries = [];
  for (const consumer of ["one", "two", "three", "four"]) {
    deliveries.push(await seedDelivery({ consumer }));
  }
  const consumers = deliveries.map(({ event, consumer }) => ({
    event,
    consumer,
  }));
  const options = { consumers, limit: 2, leaseMs: 30_000 };
  const [left, right] = await Promise.all([
    claimEventDeliveries({ ...options, workerId: "overlap-left" }),
    claimEventDeliveries({ ...options, workerId: "overlap-right" }),
  ]);
  const leftIds = new Set(left.map(({ id }) => id));
  const rightIds = new Set(right.map(({ id }) => id));
  expect(left).toHaveLength(2);
  expect(right).toHaveLength(2);
  expect([...leftIds].filter((id) => rightIds.has(id))).toHaveLength(0);
  const attempts = await pool.query(
    `SELECT "delivery_id",COUNT(*)::int AS "count"
     FROM "_damat_event_delivery_attempts"
     WHERE "delivery_id"=ANY($1::uuid[]) GROUP BY "delivery_id"`,
    [[...leftIds, ...rightIds]],
  );
  expect(attempts.rows).toHaveLength(4);
  expect(attempts.rows.every(({ count }) => count === 1)).toBe(true);
});
