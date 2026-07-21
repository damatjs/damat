import { beforeEach, expect, test } from "bun:test";
import {
  claimEventDeliveries,
  clearDurableEventDefinitions,
  createEventDeliveryContext,
} from "../../src";
import { pool, resetWorkerStorage } from "./context";
import { seedDelivery } from "./fixture";

beforeEach(async () => {
  await resetWorkerStorage();
  clearDurableEventDefinitions();
});

async function claimedContext(options = {}) {
  const item = await seedDelivery();
  const [claim] = await claimEventDeliveries({
    consumers: [{ event: item.event, consumer: item.consumer }],
    workerId: "context-worker",
    limit: 1,
    leaseMs: 30_000,
  });
  return {
    item,
    claim: claim!,
    context: createEventDeliveryContext(claim!, new AbortController(), options),
  };
}

test("progress sampling updates snapshot without duplicate history", async () => {
  const current = await claimedContext({ progressMinimumIntervalMs: 60_000 });
  await current.context.progress({ percent: 10 });
  await current.context.progress({ percent: 20 });
  const row = await pool.query(
    `SELECT "progress" FROM "_damat_event_deliveries" WHERE "id"=$1`,
    [current.item.id],
  );
  const activity = await pool.query(
    `SELECT COUNT(*)::int AS count FROM "_damat_event_activity"
     WHERE "delivery_id"=$1 AND "type"='progress'`,
    [current.item.id],
  );
  expect(row.rows[0].progress).toEqual({ percent: 20 });
  expect(activity.rows[0].count).toBe(1);
});

test("stale contexts cannot write progress or logs", async () => {
  const current = await claimedContext();
  const stale = createEventDeliveryContext(
    { ...current.claim, leaseToken: crypto.randomUUID() },
    new AbortController(),
  );
  await expect(stale.progress(1)).rejects.toThrow(/lease/i);
  await expect(stale.log("info", "stale")).rejects.toThrow(/lease/i);
});

test("log limits append one truncation activity", async () => {
  const current = await claimedContext({
    logLimits: { maxCount: 0, maxBytes: 0 },
  });
  await current.context.log("info", "one");
  await current.context.log("info", "two");
  const activity = await pool.query(
    `SELECT COUNT(*)::int AS count FROM "_damat_event_activity"
     WHERE "delivery_id"=$1 AND "type"='logs_truncated'`,
    [current.item.id],
  );
  expect(activity.rows[0].count).toBe(1);
});
