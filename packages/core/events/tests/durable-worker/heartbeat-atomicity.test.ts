import { beforeEach, expect, test } from "bun:test";
import {
  claimEventDeliveries,
  clearDurableEventDefinitions,
  heartbeatEventDelivery,
} from "../../src";
import { pool, resetWorkerStorage } from "./context";
import { seedDelivery } from "./fixture";

beforeEach(async () => {
  await resetWorkerStorage();
  clearDurableEventDefinitions();
});

test("attempt identity failure rolls back delivery heartbeat extension", async () => {
  const item = await seedDelivery();
  const [claim] = await claimEventDeliveries({
    consumers: [{ event: item.event, consumer: item.consumer }],
    workerId: "heartbeat-worker",
    limit: 1,
    leaseMs: 30_000,
  });
  const before = await leaseTimes(item.id);
  await pool.query(
    `UPDATE "_damat_event_delivery_attempts" SET "lease_token"=$2
     WHERE "delivery_id"=$1 AND "attempt_number"=1`,
    [item.id, crypto.randomUUID()],
  );
  await expect(
    heartbeatEventDelivery(claim!, { leaseMs: 60_000 }),
  ).rejects.toThrow(/lease/i);
  const after = await leaseTimes(item.id);
  expect(after.heartbeat_at.getTime()).toBe(before.heartbeat_at.getTime());
  expect(after.lease_expires_at.getTime()).toBe(
    before.lease_expires_at.getTime(),
  );
});

async function leaseTimes(id: string) {
  return (
    await pool.query(
      `SELECT "heartbeat_at","lease_expires_at"
     FROM "_damat_event_deliveries" WHERE "id"=$1`,
      [id],
    )
  ).rows[0];
}
