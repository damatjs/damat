import { beforeEach, expect, test } from "bun:test";
import { claimEventDeliveries, completeEventDeliveryFailure } from "../../src";
import {
  inspectionClient,
  pool,
  resetInspectionStorage,
  seedEvent,
} from "./fixture";

beforeEach(resetInspectionStorage);

test("attempt waits and retry schedules remain complete across retries", async () => {
  const seeded = await seedEvent();
  const delivery = seeded.deliveries[0]!;
  for (const wait of [100, 200]) {
    await pool.query(
      `UPDATE "_damat_event_deliveries" SET "status"='pending',
         "available_at"=NOW()-($2*INTERVAL '1 ms') WHERE "id"=$1`,
      [delivery.id, wait],
    );
    const [claim] = await claimEventDeliveries({
      consumers: [{ event: seeded.name, consumer: delivery.consumer }],
      workerId: `worker-${wait}`,
      limit: 1,
      leaseMs: 30_000,
    });
    await completeEventDeliveryFailure(claim!, new Error(`failure-${wait}`));
  }
  await pool.query(
    `INSERT INTO "_damat_event_delivery_attempts"
       ("delivery_id","attempt_number","worker_id","lease_token")
     VALUES ($1,99,'legacy',$2)`,
    [delivery.id, crypto.randomUUID()],
  );

  const client = inspectionClient();
  const detail = await client.getEvent(seeded.event.id);
  const summary = await client.getSummary({
    from: new Date(Date.now() - 60_000),
    to: new Date(Date.now() + 60_000),
    intervalMs: 30_000,
  });
  const schedules = detail.activity.filter(({ type }) => type === "retry_wait");

  expect(
    detail.deliveries[0].attempts.slice(0, 2).map(({ waitMs }) => waitMs),
  ).toEqual([expect.any(Number), expect.any(Number)]);
  expect(detail.deliveries[0].attempts[2]).not.toHaveProperty("waitMs");
  expect(summary.waitingMs.count).toBe(2);
  expect(schedules).toHaveLength(2);
  expect(
    schedules.every(({ metadata }) => typeof metadata.availableAt === "string"),
  ).toBe(true);
});
