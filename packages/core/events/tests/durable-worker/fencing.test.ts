import { beforeEach, expect, test } from "bun:test";
import {
  claimEventDeliveries,
  clearDurableEventDefinitions,
  completeEventDeliverySuccess,
  heartbeatEventDelivery,
} from "../../src";
import { pool, resetWorkerStorage } from "./context";
import { seedDelivery } from "./fixture";

beforeEach(async () => {
  await resetWorkerStorage();
  clearDurableEventDefinitions();
});

test("heartbeat and completion reject stale lease tokens", async () => {
  const item = await seedDelivery();
  const [claim] = await claimEventDeliveries({
    consumers: [{ event: item.event, consumer: item.consumer }],
    workerId: "worker-a",
    limit: 1,
    leaseMs: 30_000,
  });
  const stale = { ...claim!, leaseToken: crypto.randomUUID() };
  await expect(
    heartbeatEventDelivery(stale, { leaseMs: 30_000 }),
  ).rejects.toThrow(/lease/i);
  await expect(
    completeEventDeliverySuccess(stale, { ok: true }),
  ).rejects.toThrow(/lease/i);
  const row = await pool.query(
    `SELECT "status" FROM "_damat_event_deliveries" WHERE "id"=$1`,
    [item.id],
  );
  expect(row.rows[0].status).toBe("running");
});

test("heartbeat extends only a current unexpired lease", async () => {
  const item = await seedDelivery();
  const [claim] = await claimEventDeliveries({
    consumers: [{ event: item.event, consumer: item.consumer }],
    workerId: "worker-a",
    limit: 1,
    leaseMs: 30_000,
  });
  const before = claim!.leaseExpiresAt.getTime();
  await heartbeatEventDelivery(claim!, { leaseMs: 60_000 });
  const row = await pool.query(
    `SELECT "lease_expires_at" FROM "_damat_event_deliveries" WHERE "id"=$1`,
    [item.id],
  );
  expect(row.rows[0].lease_expires_at.getTime()).toBeGreaterThan(before);
});
